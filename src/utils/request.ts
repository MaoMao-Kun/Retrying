import { RETRYABLE_GENERATION_PATHS } from '../core/constants';

export function extractFetchUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input;
    }

    if (input instanceof URL) {
        return input.toString();
    }

    if (input && typeof input.url === 'string') {
        return input.url;
    }

    return '';
}

export function isRetryableGenerationRequest(requestUrl: string): boolean {
    if (!requestUrl) {
        return false;
    }

    const normalizedUrl = requestUrl.startsWith('http')
        ? new URL(requestUrl).pathname
        : requestUrl;

    return RETRYABLE_GENERATION_PATHS.has(normalizedUrl);
}
