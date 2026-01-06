/* ИСПОЛЬЗУЕМ АБСОЛЮТНЫЕ ПУТИ (РАБОТАЕТ НА ВСЕХ УРОВНЯХ ВЛОЖЕННОСТИ) */
import { extension_settings, getContext, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types } from "/script.js";

const EXTENSION_NAME = "living_world_events";
const EVENT_PROMPT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

// Инициализация настроек
// Мы ждем, пока extension_settings загрузится, поэтому делаем проверку внутри
function initSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {
            probability: 25,
            enabled: true
        };
    }
}

let triggerActive = false;

// === ГЛАВНАЯ ФУНКЦИЯ: Бросок кубика ===
function checkProbability() {
    initSettings(); // На всякий случай проверяем настройки
    triggerActive = false;

    const settings = extension_settings[EXTENSION_NAME];
    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1;

    // Пишем в консоль (F12), чтобы видеть работу скрипта
    console.log(`[Living World] Rolled: ${roll} (Needed: <= ${settings.probability})`);

    if (roll <= settings.probability) {
        triggerActive = true;
        // Показываем уведомление
        if (typeof toastr !== 'undefined') {
            toastr.info(`🎲 Event Triggered! (${roll} <= ${settings.probability})`, "Living World");
        }
    }
}

// === ИНТЕРФЕЙС: Плавающая кнопка ===
function createFloatingButton() {
    // Если кнопка уже есть, не создаем дубликат
    if (document.getElementById('lw-floating-btn')) return;

    // Стили для кнопки и меню
    const style = document.createElement('style');
    style.innerHTML = `
        #lw-floating-btn {
            position: fixed; top: 10px; left: 80px; width: 35px; height: 35px;
            background: rgba(0, 0, 0, 0.7); color: lime; border: 1px solid lime;
            border-radius: 50%; z-index: 19999; display: flex;
            align-items: center; justify-content: center; cursor: pointer;
            font-size: 20px;
        }
        #lw-settings-panel {
            display: none; position: fixed; top: 50px; left: 20px; right: 20px;
            background: rgba(20, 20, 20, 0.95); border: 1px solid #555;
            padding: 15px; border-radius: 10px; z-index: 20000; color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        #lw-settings-panel h3 { margin: 0 0 10px 0; font-size: 16px; color: lime; }
        .lw-row { margin-bottom: 15px; }
        .lw-btn {
            width: 100%; padding: 8px; background: #333; color: white;
            border: 1px solid #555; border-radius: 4px;
        }
    `;
    document.head.appendChild(style);

    // HTML кнопки
    const btn = document.createElement('div');
    btn.id = 'lw-floating-btn';
    btn.innerHTML = '🎲';
    btn.title = 'Living World Settings';
    document.body.appendChild(btn);

    // HTML меню
    const panel = document.createElement('div');
    panel.id = 'lw-settings-panel';
    panel.innerHTML = `
        <h3>Living World Settings</h3>

        <div class="lw-row">
            <label style="display:flex; align-items:center; gap: 10px;">
                <input type="checkbox" id="lw-check-enable">
                Включить события
            </label>
        </div>

        <div class="lw-row">
            <div style="display:flex; justify-content:space-between;">
                <span>Вероятность:</span>
                <span id="lw-display-val">0%</span>
            </div>
            <input type="range" id="lw-range-prob" min="0" max="100" style="width:100%;">
            <br>
            <input type="number" id="lw-num-prob" min="0" max="100" style="width:100%; margin-top:5px; background:#111; color:white; border:1px solid #555;">
        </div>

        <button class="lw-btn" id="lw-close-btn">Закрыть</button>
    `;
    document.body.appendChild(panel);

    // === Логика работы кнопок ===
    const settings = extension_settings[EXTENSION_NAME] || { probability: 25, enabled: true };

    // Элементы
    const checkbox = document.getElementById('lw-check-enable');
    const range = document.getElementById('lw-range-prob');
    const numInput = document.getElementById('lw-num-prob');
    const displayVal = document.getElementById('lw-display-val');

    // Установка начальных значений
    checkbox.checked = settings.enabled;
    range.value = settings.probability;
    numInput.value = settings.probability;
    displayVal.innerText = settings.probability + '%';

    // Обработчики событий
    btn.onclick = () => {
        panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
        initSettings(); // Обновляем данные при открытии
    };

    document.getElementById('lw-close-btn').onclick = () => {
        panel.style.display = 'none';
    };

    checkbox.onchange = (e) => {
        extension_settings[EXTENSION_NAME].enabled = e.target.checked;
        saveSettings();
    };

    const updateProb = (val) => {
        extension_settings[EXTENSION_NAME].probability = Number(val);
        range.value = val;
        numInput.value = val;
        displayVal.innerText = val + '%';
        saveSettings();
    };

    range.oninput = (e) => updateProb(e.target.value);
    numInput.oninput = (e) => updateProb(e.target.value);
}

// === СТАРТ СКРИПТА ===
jQuery(async () => {
    // 1. Ждем загрузки
    setTimeout(() => {
        initSettings();
        createFloatingButton();
        if (typeof toastr !== 'undefined') toastr.success("Loaded!", "Living World");
    }, 2000);

    // 2. Слушаем генерацию
    eventSource.on(event_types.GENERATION_STARTED, checkProbability);

    // 3. Регистрируем промт
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
