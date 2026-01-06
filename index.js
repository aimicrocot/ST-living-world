/* АГРЕССИВНЫЙ РЕЖИМ: АБСОЛЮТНЫЕ ПУТИ + ПРИНУДИТЕЛЬНАЯ ОТРИСОВКА МЕНЮ */
import { extension_settings, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types } from "/script.js";

const EXTENSION_NAME = "living_world_events";
const PROMPT_TEXT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

// Настройки по умолчанию
const defaultSettings = {
    probability: 25,
    enabled: true
};

// Проверяем настройки сразу
if (!extension_settings[EXTENSION_NAME]) {
    extension_settings[EXTENSION_NAME] = { ...defaultSettings };
}

let triggerActive = false;


// === 1. ГЛАВНАЯ ЛОГИКА ===
// Срабатывает перед тем как бот начинает писать
function checkProbability() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];

    if (!settings.enabled) return;

    // Бросаем кубик (1-100)
    const roll = Math.floor(Math.random() * 100) + 1;

    // Проверка
    if (roll <= settings.probability) {
        triggerActive = true;

        // Уведомление, что сработало
        if (typeof toastr !== 'undefined') {
            toastr.info(`Событие запущено! (Шанс: ${settings.probability}%)`, "Living World");
        }
    }
}


// === 2. ОТРИСОВКА НАСТРОЕК (Поиск меню каждую секунду) ===
function forceRenderUI() {
    // 1. Ищем контейнер с настройками расширений (ID может быть extensions_settings)
    const container = document.getElementById('extensions_settings');

    // Если меню закрыто (контейнера нет) или наш блок УЖЕ там есть -> выходим
    if (!container || document.getElementById('lw_ui_block')) return;

    // 2. Создаем HTML блок настроек
    const block = document.createElement('div');
    block.id = 'lw_ui_block';

    // СТИЛИ: Делаем яркую рамку, чтобы вы точно его заметили
    block.style.border = "2px solid #00FF00";
    block.style.padding = "10px";
    block.style.marginTop = "15px";
    block.style.borderRadius = "8px";
    block.style.background = "rgba(0, 0, 0, 0.3)";

    const settings = extension_settings[EXTENSION_NAME];

    block.innerHTML = `
        <h3 style="color: #00FF00; margin-top: 0;">Living World Events</h3>

        <!-- Галочка включения -->
        <div style="margin-bottom: 15px;">
             <label style="cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 16px;">
                 <input type="checkbox" id="lw_enabled" ${settings.enabled ? 'checked' : ''} style="transform: scale(1.5);">
                 <strong>Включить события</strong>
             </label>
        </div>

        <!-- Ввод процентов -->
        <div style="display: flex; align-items: center; gap: 10px; font-size: 16px;">
            <label>Вероятность (0-100%):</label>
            <input type="number" id="lw_probability" value="${settings.probability}" min="0" max="100"
                   style="width: 70px; padding: 5px; text-align: center; color: black; font-weight: bold;">
        </div>
    `;

    // 3. Вставляем в конец списка настроек
    container.appendChild(block);

    // 4. Оживляем элементы
    document.getElementById('lw_enabled').addEventListener('change', (e) => {
        extension_settings[EXTENSION_NAME].enabled = e.target.checked;
        saveSettings();
    });

    document.getElementById('lw_probability').addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        extension_settings[EXTENSION_NAME].probability = val;
        saveSettings();
    });
}


// === 3. ЗАПУСК ===
jQuery(async () => {
    // Подключаемся к генерации ответа
    eventSource.on(event_types.GENERATION_STARTED, checkProbability);

    // Подключаем промт
    if (typeof SillyTavern !== 'undefined' && SillyTavern.extension_prompt_types) {
        SillyTavern.extension_prompt_types.push({
            name: EXTENSION_NAME,
            value: () => triggerActive ? PROMPT_TEXT : "",
            position: 'after_scenario',
            separator: '\n\n'
        });
    }

    // ЗАПУСКАЕМ ТАЙМЕР ПОИСКА МЕНЮ
    // Каждую 1 секунду скрипт будет проверять: "Открыто ли меню настроек?"
    // Если открыто -> рисует там зеленый блок.
    setInterval(forceRenderUI, 1000);
});
