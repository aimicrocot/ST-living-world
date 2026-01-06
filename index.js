import { extension_settings, getContext, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types, saveChat } from "/script.js";

const EXTENSION_NAME = "living_world_events";
const EXTENSION_DISPLAY_NAME = "Living World Events";
const EVENT_PROMPT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

const defaultSettings = {
    probability: 25,
    enabled: true
};

let triggerActive = false;

function loadSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = { ...defaultSettings };
    }
}

function buildSettingsMenu() {
    // Проверка на jQuery
    if (typeof $ === 'undefined') return;

    const settingsHtml = `
    <div class="living-world-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Living World Events</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="font-size:small;">
                <label class="checkbox_label">
                    <input type="checkbox" id="living_world_enable" ${extension_settings[EXTENSION_NAME].enabled ? 'checked' : ''}>
                    Enable Random Events
                </label>
                <br>
                <label>
                    Probability: <span id="living_world_prob_val">${extension_settings[EXTENSION_NAME].probability}</span>%
                    <input type="range" id="living_world_probability" min="1" max="100" value="${extension_settings[EXTENSION_NAME].probability}">
                </label>
            </div>
        </div>
    </div>
    `;

    const container = $('#extensions_settings');
    if (container.length && container.find('#living_world_enable').length === 0) {
        container.append(settingsHtml);

        $('#living_world_enable').on('change', function() {
            extension_settings[EXTENSION_NAME].enabled = !!this.checked;
            saveSettings();
        });

        $('#living_world_probability').on('input', function() {
            const val = $(this).val();
            $('#living_world_prob_val').text(val);
            extension_settings[EXTENSION_NAME].probability = Number(val);
            saveSettings();
        });
    }
}

function onGenerationStarted() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];
    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;

    if (roll <= settings.probability) {
        triggerActive = true;

        // Используем глобальный toastr, если доступен
        if (typeof toastr !== 'undefined') {
            toastr.info(`Living World Event Triggered! (Roll: ${roll} <= ${settings.probability})`, "Event System");
        }
        console.log(`[Living World] Event triggered. Roll: ${roll}`);
    } else {
        console.log(`[Living World] No event. Roll: ${roll} > ${settings.probability}`);
    }
}

jQuery(async () => {
    loadSettings();
    // Небольшая задержка для рендеринга UI
    setTimeout(buildSettingsMenu, 2000);

    eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);

    if (typeof SillyTavern !== 'undefined' && SillyTavern.extension_prompt_types) {
        SillyTavern.extension_prompt_types.push({
            name: EXTENSION_NAME,
            value: () => {
                return triggerActive ? EVENT_PROMPT : "";
            },
            position: 'after_scenario',
            separator: '\n\n'
        });
    }
});
