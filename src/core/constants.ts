export const RETRYABLE_GENERATION_PATHS = new Set([
    '/api/backends/kobold/generate',
    '/api/backends/koboldhorde/generate',
    '/api/backends/text-completions/generate',
    '/api/backends/chat-completions/generate',
    '/api/novelai/generate',
]);

export const RETRYING_FETCH_PATCH_FLAG = '__retryingExtensionFetchPatched';
export const RETRYING_TOAST_PATCH_FLAG = '__retryingExtensionToastPatched';
export const RETRYING_SKIP_TOAST_FLAG = '__retryingExtensionSkipToast';

export const RETRYABLE_ERROR_TITLES = new Set([
    'API Error',
    'Text generation error',
    'API returned an error',
    'Text Completion API',
    'Chat Completion API',
    'NovelAI API',
    'KoboldAI API',
]);
