import type { RetryingSettings } from '../settings';
import { isAbortLikeError } from '../utils/errors';

const RETRYABLE_GENERATION_TYPES = new Set(['normal', 'regenerate', 'continue']);

type RetryFailure = {
    signature?: string;
};

type RetryControllerOptions = {
    generate: (type: string) => Promise<unknown>;
    updateStatus: (message: string) => void;
    notify: (level: 'info' | 'error', message: string) => void;
    setTimer?: (callback: () => void | Promise<void>, delay: number) => ReturnType<typeof globalThis.setTimeout>;
    clearTimer?: (timerId: ReturnType<typeof globalThis.setTimeout>) => void;
};

export function createRetryController({
    generate,
    updateStatus,
    notify,
    setTimer = globalThis.setTimeout.bind(globalThis),
    clearTimer = globalThis.clearTimeout.bind(globalThis),
}: RetryControllerOptions) {
    const state = {
        isGenerationActive: false,
        isRetryScheduled: false,
        isRetryExecuting: false,
        retryCount: 0,
        lastGenerationType: 'normal',
        lastFailureSignature: '',
        userStoppedGeneration: false,
        retryTimerId: null as ReturnType<typeof globalThis.setTimeout> | null,
        currentAttemptFailed: false,
        currentAttemptSucceeded: false,
    };

    function clearRetryTimer() {
        if (state.retryTimerId !== null) {
            clearTimer(state.retryTimerId);
            state.retryTimerId = null;
        }
    }

    function reset(status = 'Idle') {
        clearRetryTimer();
        state.isGenerationActive = false;
        state.isRetryScheduled = false;
        state.isRetryExecuting = false;
        state.retryCount = 0;
        state.lastFailureSignature = '';
        state.userStoppedGeneration = false;
        state.currentAttemptFailed = false;
        state.currentAttemptSucceeded = false;
        updateStatus(status);
    }

    function startGeneration(type: string) {
        if (!RETRYABLE_GENERATION_TYPES.has(type)) {
            return;
        }

        if (!state.isRetryExecuting) {
            state.retryCount = 0;
        }

        state.isGenerationActive = true;
        state.isRetryScheduled = false;
        state.currentAttemptFailed = false;
        state.currentAttemptSucceeded = false;
        state.userStoppedGeneration = false;
        state.lastGenerationType = type;
        state.isRetryExecuting = false;
        updateStatus(state.retryCount > 0 ? `Retry ${state.retryCount} in progress` : 'Generating');
    }

    function markAttemptSuccess() {
        if (!state.isGenerationActive) {
            return;
        }

        state.currentAttemptSucceeded = true;
        state.currentAttemptFailed = false;
        state.lastFailureSignature = '';
    }

    function completeGeneration() {
        if (state.userStoppedGeneration) {
            return;
        }

        if (state.isRetryScheduled || (state.currentAttemptFailed && !state.currentAttemptSucceeded)) {
            state.isGenerationActive = false;
            return;
        }

        reset('Idle');
    }

    function stopByUser() {
        clearRetryTimer();
        state.userStoppedGeneration = true;
        state.isGenerationActive = false;
        state.isRetryScheduled = false;
        state.isRetryExecuting = false;
        state.retryCount = 0;
        state.lastFailureSignature = '';
        state.currentAttemptFailed = false;
        state.currentAttemptSucceeded = false;
        updateStatus('Stopped');
    }

    async function handleFailure(failure: RetryFailure, settings: RetryingSettings) {
        if (!settings.enabled || !state.isGenerationActive || state.userStoppedGeneration || state.isRetryScheduled) {
            return { shouldRetry: false, exhausted: false };
        }

        if (failure.signature && failure.signature === state.lastFailureSignature) {
            return { shouldRetry: false, exhausted: false };
        }

        state.currentAttemptFailed = true;
        state.currentAttemptSucceeded = false;
        state.lastFailureSignature = failure.signature ?? '';

        if (state.retryCount >= settings.maxRetries) {
            state.isGenerationActive = false;
            state.isRetryExecuting = false;
            updateStatus('Retry limit reached');
            if (settings.showToasts) {
                notify('error', `Retry limit reached after ${state.retryCount} retries.`);
            }
            return { shouldRetry: false, exhausted: true };
        }

        state.retryCount += 1;
        state.isRetryScheduled = true;
        state.isRetryExecuting = false;
        updateStatus(`Retry ${state.retryCount} scheduled`);

        if (settings.showToasts) {
            notify('info', `Retry ${state.retryCount}/${settings.maxRetries} scheduled in ${settings.retryDelayMs} ms.`);
        }

        state.retryTimerId = setTimer(async () => {
            state.retryTimerId = null;
            if (state.userStoppedGeneration) {
                state.isRetryScheduled = false;
                return;
            }

            state.isRetryScheduled = false;
            state.isRetryExecuting = true;
            updateStatus(`Retry ${state.retryCount} in progress`);

            try {
                await generate('regenerate');
            } catch (error) {
                state.isRetryExecuting = false;
                if (!isAbortLikeError(error)) {
                    console.warn('Retrying extension failed to trigger regenerate()', error);
                }
            }
        }, settings.retryDelayMs);

        return { shouldRetry: true, exhausted: false };
    }

    return {
        state,
        reset,
        startGeneration,
        markAttemptSuccess,
        completeGeneration,
        stopByUser,
        handleFailure,
    };
}
