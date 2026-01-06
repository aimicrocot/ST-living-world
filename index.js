/* ПУТИ ДЛЯ ПАПКИ third-party (глубина 3) */
import { extension_settings, getContext, saveSettings } from "../../../extensions.js";
import { eventSource, event_types } from "../../../script.js";

const EXTENSION_NAME = "living_world_events";
const EVENT_PROMPT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

// Настройки по умолчанию
if (!extension_settings[EXTENSION_NAME]) {
    extension_settings[EXTENSION_NAME] = {
        probability: 25,
        enabled: true
    };
}

let triggerActive = false;

// === 1. ГРОМКОЕ ПОДТВЕРЖДЕНИЕ ЗАГРУЗКИ ===
// Если вы видите это окно при старте, значит скрипт РАБОТАЕТ.
// Если нет - значит браузер не нашел файл.
setTimeout(() => {
    // alert("[Living World] Расширение успешно загружено!");
    // ^ Раскомментируйте строчку выше, если хотите назойливое окно.
    // Пока используем Toastr:
    if (typeof toastr !== 'undefined') {
        toastr.success("Living World Loaded!", "System");
    }
}, 2000);


// === 2. СОЗДАНИЕ ПЛАВАЮЩЕЙ КНОПКИ (Управление) ===
// Мы добавим кнопку прямо на экран, чтобы не искать её в меню.
function createFloatingButton() {
    if ($('#lw-floating-btn').length > 0) return;

    const btnHtml = `
    <div id="lw-floating-btn" title="Living World Settings"
         style="position: fixed; top: 10px; left: 100px; width: 30px; height: 30px;
                background: black; color: white; border: 1px solid lime; border-radius: 50%;
                z-index: 20000; display: flex; align-items: center; justify-content: center;
                cursor: pointer; font-size: 20px; opacity: 0.5;">
        🎲
    </div>

    <!-- Окно настроек (скрытое) -->
    <div id="lw-settings-modal" style="display: none; position: fixed; top: 50px; left: 50px;
                width: 250px; background: rgba(0,0,0,0.9); border: 1px solid lime; pading: 10px;
                z-index: 20001; padding: 15px; border-radius: 5px; color: white;">

        <h3>Living World</h3>
        <hr>

        <label style="display:block; margin: 10px 0;">
            <input type="checkbox" id="lw_enabled_float" ${extension_settings[EXTENSION_NAME].enabled ? 'checked' : ''}>
            Включить события
        </label>

        <label style="display:block; margin: 10px 0;">
            Вероятность: <b><span id="lw_val_float">${extension_settings[EXTENSION_NAME].probability}</span>%</b>
        </label>

        <input type="range" id="lw_slider_float" min="0" max="100" value="${extension_settings[EXTENSION_NAME].probability}" style="width: 100%;">
        <br><br>
        <button id="lw_close_float" style="width: 100%;">Закрыть</button>
    </div>
    `;

    $('body').append(btnHtml);

    // Логика кнопки
    $('#lw-floating-btn').on('click', () => {
        $('#lw-settings-modal').toggle();
    });

    $('#lw_close_float').on('click', () => {
        $('#lw-settings-modal').hide();
    });

    // Логика чекбокса
    $('#lw_enabled_float').on('change', function() {
        extension_settings[EXTENSION_NAME].enabled = !!this.checked;
        saveSettings();
    });

    // Логика слайдера
    $('#lw_slider_float').on('input', function() {
        const val = $(this).val();
        $('#lw_val_float').text(val);
        extension_settings[EXTENSION_NAME].probability = Number(val);
        saveSettings();
    });
}


// === 3. ОСНОВНАЯ ЛОГИКА ===
function checkProbability() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];
    if (!settings || !settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;
    console.log(`[Living World] Dice: ${roll} / ${settings.probability}`);

    if (roll <= settings.probability) {
        triggerActive = true;
        if (typeof toastr !== 'undefined') {
            toastr.info(`🎲 Event Triggered! (${roll}<=${settings.probability})`, "Living World");
        }
    }
}

jQuery(async () => {
    // Ждем полной загрузки интерфейса
    setTimeout(createFloatingButton, 3000);

    // Подключаемся к генерации
    eventSource.on(event_types.GENERATION_STARTED, checkProbability);

    // Внедряем промт
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
