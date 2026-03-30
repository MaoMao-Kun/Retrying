import { RETRYING_FETCH_PATCH_FLAG, RETRYING_SKIP_TOAST_FLAG, RETRYING_TOAST_PATCH_FLAG } from './constants';
import type { RetryingSettings } from '../settings';
import { isAbortLikeError, isRetryableToastError } from '../utils/errors';
import { extractFetchUrl, isRetryableGenerationRequest } from '../utils/request';

type RetryController = {
    state: {
        isGenerationActive: boolean;
        userStoppedGeneration: boolean;
    };
    markAttemptSuccess: () => void;
    handleFailure: (failure: { signature: string }, settings: RetryingSettings) => Promise<unknown>;
};

export function installFetchInterceptor(
    controller: RetryController,
    getSettings: () => RetryingSettings,
) {
    if ((globalThis as Record<string, unknown>)[RETRYING_FETCH_PATCH_FLAG]) {
        return;
    }

    const originalFetch = globalThis.fetch.bind(globalThis);
    (globalThis as Record<string, unknown>)[RETRYING_FETCH_PATCH_FLAG] = true;

    globalThis.fetch = async (...args) => {
        const url = extractFetchUrl(args[0]);
        const shouldTrack = controller.state.isGenerationActive && isRetryableGenerationRequest(url);

        try {
            const response = await originalFetch(...args);

            if (shouldTrack) {
                if (response.ok) {
                    controller.markAttemptSuccess();
                } else {
                    void controller.handleFailure({ signature: `${response.status}:${url}` }, getSettings());
                }
            }

            return response;
        } catch (error) {
            if (shouldTrack && !isAbortLikeError(error)) {
                void controller.handleFailure({ signature: `network:${url}` }, getSettings());
            }

            throw error;
        }
    };
}

export function installToastInterceptor(
    controller: RetryController,
    getSettings: () => RetryingSettings,
) {
    if ((globalThis as Record<string, unknown>)[RETRYING_TOAST_PATCH_FLAG] || !globalThis.toastr?.error) {
        return;
    }

    const originalError = globalThis.toastr.error.bind(globalThis.toastr);
    (globalThis as Record<string, unknown>)[RETRYING_TOAST_PATCH_FLAG] = true;

    globalThis.toastr.error = (message, title, optionsOverride) => {
        if (!(globalThis as Record<string, unknown>)[RETRYING_SKIP_TOAST_FLAG]
            && controller.state.isGenerationActive
            && isRetryableToastError(message, title)
            && !controller.state.userStoppedGeneration) {
            void controller.handleFailure(
                { signature: `toast:${String(title || '')}:${String(message || '')}` },
                getSettings(),
            );
        }

        return originalError(message, title, optionsOverride);
    };
}
