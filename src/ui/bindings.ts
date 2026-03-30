import type { RetryingSettings } from '../settings';

type BindingOptions = {
    getSettings: () => RetryingSettings;
    setSettings: (settings: Partial<RetryingSettings>) => void;
};

export function syncRetryingControls(settings: RetryingSettings) {
    globalThis.$('#retrying_enabled').prop('checked', settings.enabled);
    globalThis.$('#retrying_max_retries').val(String(settings.maxRetries));
    globalThis.$('#retrying_delay_ms').val(String(settings.retryDelayMs));
    globalThis.$('#retrying_show_toasts').prop('checked', settings.showToasts);
}

export function bindRetryingControls({ getSettings, setSettings }: BindingOptions) {
    globalThis.$('#retrying_enabled').off('input').on('input', () => {
        setSettings({
            enabled: globalThis.$('#retrying_enabled').prop('checked') as boolean,
        });
    });

    globalThis.$('#retrying_max_retries').off('input').on('input', () => {
        setSettings({
            maxRetries: Number(globalThis.$('#retrying_max_retries').val()),
        });
        syncRetryingControls(getSettings());
    });

    globalThis.$('#retrying_delay_ms').off('input').on('input', () => {
        setSettings({
            retryDelayMs: Number(globalThis.$('#retrying_delay_ms').val()),
        });
        syncRetryingControls(getSettings());
    });

    globalThis.$('#retrying_show_toasts').off('input').on('input', () => {
        setSettings({
            showToasts: globalThis.$('#retrying_show_toasts').prop('checked') as boolean,
        });
    });
}
