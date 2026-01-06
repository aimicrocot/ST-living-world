/* Используем абсолютные пути, которые заработали в прошлый раз */
import { extension_settings, getContext, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types, saveChat } from "/script.js";

/* Попытка импорта парсера команд (если не сработает, код не упадет) */
let SlashCommandParser;
try {
    const module = await import("/scripts/slash-commands/SlashCommandParser.js");
    SlashCommandParser = module.SlashCommandParser;
} catch (e) {
    console.warn("SlashCommandParser import failed, commands might not work via import.", e);
}

const EXTENSION_NAME = "living_world_events";
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
    // Если меню уже нарисовано, не рисуем снова
    if ($('#living-world-btn-settings').length > 0) return;

    // Ищем контейнер настроек расширений
    const container = $('#extensions_settings');
    if (container.length === 0) return; // Если контейнера нет, выходим и ждем следующей попытки

    const settingsHtml = `
    <div id="living-world-btn-settings" class="living-world-settings" style="border: 1px solid #444; padding: 10px; margin-top: 5px; background: rgba(0,0,0,0.2);">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Living World Events</b>
        </div>
        <div class="inline-drawer-content" style="font-size:small; margin-top: 5px;">
            <label class="checkbox_label" style="display: flex; align-items: center;">
                <input type="checkbox" id="living_world_enable" ${extension_settings[EXTENSION_NAME].enabled ? 'checked' : ''} style="margin-right: 10px;">
                Enable Random Events
            </label>
            <br>
            <label>
                Probability: <span id="living_world_prob_val" style="font-weight:bold;">${extension_settings[EXTENSION_NAME].probability}</span>%
                <br>
                <input type="range" id="living_world_probability" min="1" max="100" value="${extension_settings[EXTENSION_NAME].probability}" style="width: 100%;">
            </label>
            <hr>
            <div style="font-size: 0.8em; opacity: 0.7;">
                Commands: <br>
                /lw_chance 50 <br>
                /lw_toggle
            </div>
        </div>
    </div>
    `;

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

function onGenerationStarted() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];
    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;

    if (roll <= settings.probability) {
        triggerActive = true;
        if (typeof toastr !== 'undefined') {
            toastr.info(`Event Triggered! (Roll: ${roll})`, "Living World");
        }
        console.log(`[Living World] Event triggered. Roll: ${roll}`);
    }
}

// Регистрация слэш-команд вручную (если импорт не сработал или глобально)
function registerCommands() {
    // Пытаемся найти глобальный парсер или тот что импортировали
    const Parser = SlashCommandParser || window.SlashCommandParser;
    if (!Parser) return;

    Parser.addCommandObject(Parser.commands, {
        name: 'lw_chance',
        description: 'Set probability for Living World events (0-100)',
        callback: (args, value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0 && num <= 100) {
                extension_settings[EXTENSION_NAME].probability = num;
                saveSettings();
                // Обновляем ползунок если он есть
                $('#living_world_probability').val(num);
                $('#living_world_prob_val').text(num);
                if (typeof toastr !== 'undefined') toastr.success(`Probability set to ${num}%`);
            } else {
                if (typeof toastr !== 'undefined') toastr.warning(`Invalid number. Use 0-100.`);
            }
        }
    });

    Parser.addCommandObject(Parser.commands, {
        name: 'lw_toggle',
        description: 'Enable/Disable Living World events',
        callback: () => {
             extension_settings[EXTENSION_NAME].enabled = !extension_settings[EXTENSION_NAME].enabled;
             saveSettings();
             // Обновляем чекбокс
             $('#living_world_enable').prop('checked', extension_settings[EXTENSION_NAME].enabled);
             if (typeof toastr !== 'undefined') toastr.success(`Living World: ${extension_settings[EXTENSION_NAME].enabled ? 'ON' : 'OFF'}`);
        }
    });
}

jQuery(async () => {
    loadSettings();

    // Уведомление о том, что файл загрузился успешно
    if (typeof toastr !== 'undefined') toastr.success("Extension Loaded", "Living World");

    // Пытаемся найти меню каждые 1 сек в течение первых 15 секунд
    // Это решит проблему медленной загрузки телефона
    let attempts = 0;
    const menuInterval = setInterval(() => {
        attempts++;
        if ($('#extensions_settings').length > 0) {
            buildSettingsMenu();
            // Не очищаем интервал сразу, на случай если пользователь закроет/откроет меню
            // Но чтобы не грузить, остановим после 20 секунд
        }
        if (attempts > 20) clearInterval(menuInterval);
    }, 1000);

    // Также вешаем на клик по иконке расширений (если получится поймать)
    $('#extensions_button').on('click', () => setTimeout(buildSettingsMenu, 500));

    eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);

    // Регистрируем команды с задержкой
    setTimeout(registerCommands, 3000);

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
