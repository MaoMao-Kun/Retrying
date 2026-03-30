export type RetryingSettings = {
    enabled: boolean;
    maxRetries: number;
    retryDelayMs: number;
    showToasts: boolean;
};

export const DEFAULT_RETRYING_SETTINGS: Readonly<RetryingSettings> = Object.freeze({
    enabled: true,
    maxRetries: 3,
    retryDelayMs: 1500,
    showToasts: true,
});

export function sanitizeRetryingSettings(settings: Record<string, unknown> = {}): RetryingSettings {
    const maxRetriesValue = Number(settings.maxRetries);
    const retryDelayValue = Number(settings.retryDelayMs);

    return {
        enabled: settings.enabled !== false,
        maxRetries: Number.isFinite(maxRetriesValue)
            ? Math.max(0, Math.trunc(maxRetriesValue))
            : DEFAULT_RETRYING_SETTINGS.maxRetries,
        retryDelayMs: Number.isFinite(retryDelayValue)
            ? Math.max(0, Math.min(30000, Math.trunc(retryDelayValue)))
            : DEFAULT_RETRYING_SETTINGS.retryDelayMs,
        showToasts: settings.showToasts === false ? false : Boolean(settings.showToasts ?? true),
    };
}
