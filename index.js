/* АБСОЛЮТНЫЕ ПУТИ - РАБОЧИЙ ВАРИАНТ */
import { extension_settings, getContext, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types } from "/script.js";

const EXTENSION_NAME = "living_world_events";
const PROMPT_TEXT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

const defaultSettings = {
    probability: 25,
    enabled: true
};

let triggerActive = false;

// === 1. ЛОГИКА ===
function checkProbability() {
    triggerActive = false;
    // Инициализация настроек "на лету", если их еще нет
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = { ...defaultSettings };
    }

    const settings = extension_settings[EXTENSION_NAME];

    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;

    // Вывод в консоль для проверки (если нужно)
    console.log(`[Living World] Rolled: ${roll} (Target: <= ${settings.probability})`);

    if (roll <= settings.probability) {
        triggerActive = true;
        // Уведомление только при срабатывании события
        if (typeof toastr !== 'undefined') {
            toastr.info("Event Triggered!", "Living World");
        }
    }
}

// === 2. МЕНЮ НАСТРОЕК (Поле ввода) ===
function injectSettings() {
    // Ищем список расширений
    const container = document.getElementById('extensions_settings');
    if (!container) return;

    // Если наш блок уже есть - выходим
    if (document.getElementById('lw_settings_block')) return;

    // Если настройки не инициализированы - делаем это
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = { ...defaultSettings };
    }
    const settings = extension_settings[EXTENSION_NAME];

    // Создаем блок
    const block = document.createElement('div');
    block.id = 'lw_settings_block';
    // Стилизуем под стандартный блок настроек ST
    block.style.background = 'rgba(0, 0, 0, 0.2)';
    block.style.padding = '10px';
    block.style.marginTop = '10px';
    block.style.borderRadius = '5px';
    block.style.border = '1px solid #444';

    block.innerHTML = `
        <h4 style="margin: 0 0 10px 0; font-weight: bold;">Living World Events</h4>

        <div style="margin-bottom: 10px;">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="lw_enable_cb" ${settings.enabled ? 'checked' : ''}>
                Включить внедрение событий
            </label>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
            <span>Вероятность (%):</span>
            <input type="number" id="lw_prob_input" min="0" max="100"
                   value="${settings.probability}"
                   style="width: 80px; text-align: center; padding: 5px; background: #222; color: #fff; border: 1px solid #555;">
        </div>
    `;

    container.appendChild(block);

    // Логика сохранения чекбокса
    document.getElementById('lw_enable_cb').addEventListener('change', (e) => {
        extension_settings[EXTENSION_NAME].enabled = e.target.checked;
        saveSettings();
    });

    // Логика сохранения цифр
    document.getElementById('lw_prob_input').addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        // Ограничиваем 0-100
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        extension_settings[EXTENSION_NAME].probability = val;
        saveSettings();
    });
}

// === 3. ЗАПУСК ===
jQuery(async () => {
    // 1. Подключаемся к генерации
    eventSource.on(event_types.GENERATION_STARTED, checkProbability);

    // 2. Внедряем текст промта
    if (typeof SillyTavern !== 'undefined' && SillyTavern.extension_prompt_types) {
        SillyTavern.extension_prompt_types.push({
            name: EXTENSION_NAME,
            value: () => {
                return triggerActive ? PROMPT_TEXT : "";
            },
            position: 'after_scenario',
            separator: '\n\n'
        });
    }

    // 3. Следим за появлением меню (fix для Android)
    const observer = new MutationObserver((mutations) => {
        injectSettings();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Попытка сразу нарисовать, если меню открыто
    injectSettings();
});
