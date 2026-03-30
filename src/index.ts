import './style.css';

import { RETRYING_SKIP_TOAST_FLAG } from './core/constants';
import { installFetchInterceptor, installToastInterceptor } from './core/interceptors';
import { createRetryController } from './core/retry-controller';
import { DEFAULT_RETRYING_SETTINGS, sanitizeRetryingSettings, type RetryingSettings } from './settings';
import { bindRetryingControls, syncRetryingControls } from './ui/bindings';
import { renderRetryingControls, updateStatus } from './ui/render';

function getStContext() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function getRetryingSettings(): RetryingSettings {
    const context = getStContext();
    const settingsStore = context?.extensionSettings ?? globalThis.extension_settings;
    const currentSettings = settingsStore.retrying as Partial<RetryingSettings> | undefined;
    const sanitizedSettings = sanitizeRetryingSettings(currentSettings ?? {});

    settingsStore.retrying = sanitizedSettings;
    return sanitizedSettings;
}

function setRetryingSettings(nextSettings: Partial<RetryingSettings>) {
    const context = getStContext();
    const settingsStore = context?.extensionSettings ?? globalThis.extension_settings;
    const sanitizedSettings = sanitizeRetryingSettings({
        ...getRetryingSettings(),
        ...nextSettings,
    });
    settingsStore.retrying = sanitizedSettings;
    (context?.saveSettingsDebounced ?? globalThis.saveSettingsDebounced)();
}

function notify(level: 'info' | 'error', message: string) {
    (globalThis as Record<string, unknown>)[RETRYING_SKIP_TOAST_FLAG] = true;

    try {
        if (level === 'error') {
            globalThis.toastr.error(message, 'Retrying');
            return;
        }

        globalThis.toastr.info(message, 'Retrying');
    } finally {
        (globalThis as Record<string, unknown>)[RETRYING_SKIP_TOAST_FLAG] = false;
    }
}

globalThis.jQuery(() => {
    const context = getStContext();
    const settingsStore = context?.extensionSettings ?? globalThis.extension_settings;

    if (!settingsStore.retrying) {
        settingsStore.retrying = DEFAULT_RETRYING_SETTINGS;
    }

    const controller = createRetryController({
        generate: async (type) => (context?.generate ?? globalThis.Generate)(type),
        updateStatus,
        notify,
    });

    installFetchInterceptor(controller, getRetryingSettings);
    installToastInterceptor(controller, getRetryingSettings);

    const eventSource = context?.eventSource ?? globalThis.eventSource;
    const eventTypes = context?.eventTypes ?? globalThis.event_types;

    eventSource.on(eventTypes.GENERATION_STARTED, (type: unknown, _options: unknown, dryRun: unknown) => {
        if (!dryRun) {
            controller.startGeneration(String(type));
        }
    });

    eventSource.on(eventTypes.GENERATION_ENDED, () => controller.completeGeneration());
    eventSource.on(eventTypes.GENERATION_STOPPED, () => controller.stopByUser());
    eventSource.on(eventTypes.MESSAGE_RECEIVED, () => controller.markAttemptSuccess());
    eventSource.on(eventTypes.CHAT_CHANGED, () => controller.reset('Idle'));

    const mountUi = () => {
        const didRender = renderRetryingControls('Retrying');
        if (!didRender) {
            return false;
        }

        syncRetryingControls(getRetryingSettings());
        if (!globalThis.$('#retrying_status').text()) {
            updateStatus('Idle');
        }
        bindRetryingControls({
            getSettings: getRetryingSettings,
            setSettings: setRetryingSettings,
        });
        return true;
    };

    mountUi();

    const observer = new MutationObserver(() => {
        void mountUi();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
});
