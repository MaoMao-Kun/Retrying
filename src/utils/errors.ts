import { RETRYABLE_ERROR_TITLES } from '../core/constants';

export function isAbortLikeError(error: unknown): boolean {
    if (error === 'Clicked stop button') {
        return true;
    }

    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const maybeError = error as { name?: string; message?: string };

    return maybeError.name === 'AbortError' || maybeError.message === 'Generation was aborted.';
}

export function isRetryableToastError(message: unknown, title: unknown): boolean {
    if (typeof title === 'string' && RETRYABLE_ERROR_TITLES.has(title)) {
        return true;
    }

    return typeof message === 'string' && message.toLowerCase().includes('reply from api');
}
