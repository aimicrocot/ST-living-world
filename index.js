import { extension_settings, getContext, saveSettings } from "../../extensions.js";
import { eventSource, event_types, saveChat } from "../../script.js";
import { toastr } from "../../toastr_plugin.js";

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
    const settingsHtml = `
    <div class="living-world-settings-container">
        <label class="checkbox_label">
            <input type="checkbox" id="living_world_enable" ${extension_settings[EXTENSION_NAME].enabled ? "checked" : ""}>
            Enable Living World Events
        </label>
        <hr>
        <div class="range-field">
            <label for="living_world_probability">Event Probability: <span id="living_world_prob_val">${extension_settings[EXTENSION_NAME].probability}</span>%</label>
            <input type="range" id="living_world_probability" min="0" max="100" step="1" value="${extension_settings[EXTENSION_NAME].probability}">
            <small>Chance to inject the OOC prompt for each AI response.</small>
        </div>
    </div>
    `;

    $('#extensions_settings').append(`<div id="living_world_settings_block" class="extension_block"><h4>${EXTENSION_DISPLAY_NAME}</h4>${settingsHtml}</div>`);

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

function onGenerationStarted() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];
    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;

    if (roll <= settings.probability) {
        triggerActive = true;
        toastr.info(`Living World Event Triggered! (Roll: ${roll} <= ${settings.probability})`, "Event System");
        console.log(`[Living World] Event triggered. Roll: ${roll}`);
    } else {
        console.log(`[Living World] No event. Roll: ${roll} > ${settings.probability}`);
    }
}

jQuery(async () => {
    loadSettings();
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
