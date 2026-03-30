export function renderRetryingControls(title: string): boolean {
    if (globalThis.$('#retrying_container').length) {
        return true;
    }

    const primaryTarget = globalThis.$('#extensions_settings');
    const fallbackTarget = globalThis.$('#extensions_settings2');
    const target = primaryTarget.length ? primaryTarget : fallbackTarget;

    if (!target.length) {
        return false;
    }

    target.prepend(`
        <div id="retrying_container" class="extension_container">
            <div class="inline-drawer retrying_drawer">
                <div class="inline-drawer-toggle inline-drawer-header retrying_drawer_header">
                    <b>${title}</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                </div>
                <div class="inline-drawer-content retrying_drawer_content" style="display: none;">
                    <div class="retrying_panel">
                        <label class="retrying_row" for="retrying_enabled">
                            <span class="retrying_label">Enable auto-retry</span>
                            <input id="retrying_enabled" type="checkbox" />
                        </label>
                        <label class="retrying_row" for="retrying_max_retries">
                            <span class="retrying_label">Max retries</span>
                            <input id="retrying_max_retries" type="number" min="0" />
                        </label>
                        <label class="retrying_row" for="retrying_delay_ms">
                            <span class="retrying_label">Retry delay (ms)</span>
                            <input id="retrying_delay_ms" type="number" min="0" max="30000" step="100" />
                        </label>
                        <label class="retrying_row" for="retrying_show_toasts">
                            <span class="retrying_label">Show notifications</span>
                            <input id="retrying_show_toasts" type="checkbox" />
                        </label>
                        <div id="retrying_status" class="retrying_status">Idle</div>
                    </div>
                </div>
            </div>
        </div>
    `);

    return true;
}

export function updateStatus(message: string) {
    globalThis.$('#retrying_status').text(message);
}
