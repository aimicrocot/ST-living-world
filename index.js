// Используем самые надежные пути (абсолютные)
import { extension_settings, getContext, saveSettings } from "/scripts/extensions.js";
import { eventSource, event_types } from "/script.js";

const EXTENSION_NAME = "living_world_events";
const EXTENSION_DISPLAY_NAME = "Living World Events";
const EVENT_PROMPT = "[OOC: Introduce new events, characters, and create a living world that feel organic to the current story.]";

// Стандартные настройки
const defaultSettings = {
    probability: 25,
    enabled: true
};

let triggerActive = false;

// 1. Функция загрузки настроек
function loadSettings() {
    console.log("[Living World] Loading settings...");
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = { ...defaultSettings };
    }
}

// 2. Функция, которая создает меню (Слайдер + Поле ввода)
function renderSettings() {
    // Ищем контейнер расширений
    const container = $('#extensions_settings');

    // Если контейнера нет (меню закрыто), ничего не делаем
    if (container.length === 0) return;

    // Проверяем, не нарисовали ли мы уже настройки
    if ($('#living-world-settings-block').length > 0) return;

    console.log("[Living World] Rendering GUI...");

    const currentProb = extension_settings[EXTENSION_NAME].probability;
    const isEnabled = extension_settings[EXTENSION_NAME].enabled;

    const html = `
    <div id="living-world-settings-block" class="extension_block">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Living World Events</b>
        </div>
        <div class="inline-drawer-content">
            <!-- Чекбокс включения -->
            <label class="checkbox_label" style="display: flex; align-items: center; margin-bottom: 10px;">
                <input type="checkbox" id="lw_enabled" ${isEnabled ? 'checked' : ''} style="margin-right: 10px;">
                Enable Random Events
            </label>

            <!-- Поле ввода процентов и Слайдер -->
            <label>Probability (%)</label>
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="number" id="lw_input" min="0" max="100" value="${currentProb}" class="text_pole" style="width: 60px;">
                <input type="range" id="lw_slider" min="0" max="100" value="${currentProb}" style="flex-grow: 1;">
            </div>
            <div style="font-size: 0.8em; opacity: 0.6; margin-top: 5px;">
                Chance that the OOC prompt will be injected.
            </div>
        </div>
    </div>
    <hr>`;

    container.append(html);

    // Логика работы кнопок
    $('#lw_enabled').on('change', function() {
        extension_settings[EXTENSION_NAME].enabled = !!this.checked;
        saveSettings();
    });

    // Связываем поле ввода и слайдер
    $('#lw_input').on('input', function() {
        let val = parseInt($(this).val());
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        $('#lw_slider').val(val);
        extension_settings[EXTENSION_NAME].probability = val;
        saveSettings();
    });

    $('#lw_slider').on('input', function() {
        const val = $(this).val();
        $('#lw_input').val(val);
        extension_settings[EXTENSION_NAME].probability = Number(val);
        saveSettings();
    });
}

// 3. Основная логика работы (бросок кубика)
function checkProbability() {
    triggerActive = false;
    const settings = extension_settings[EXTENSION_NAME];

    // Защита, если настройки не загрузились
    if (!settings) return;
    if (!settings.enabled) return;

    const roll = Math.floor(Math.random() * 100) + 1; // 1-100

    console.log(`[Living World] Rolled: ${roll}, Target: ${settings.probability}`);

    if (roll <= settings.probability) {
        triggerActive = true;

        // Показываем уведомление (Toast)
        if (typeof toastr !== 'undefined') {
            toastr.info(`Random Event Triggered! (Chance: ${settings.probability}%)`, "Living World");
        }
    }
}

// 4. Запуск расширения
jQuery(async () => {
    // Ждем секунду, чтобы Таверна "проснулась"
    setTimeout(() => {
        try {
            loadSettings();

            // Если toastr доступен, пишем что загрузились
            if (typeof toastr !== 'undefined') {
                toastr.success("Living World Extension Ready", "System");
            }

            // 1. Слушаем открытие меню расширений, чтобы нарисовать кнопки
            // Используем MutationObserver, так как на Android события клика могут теряться
            const observer = new MutationObserver((mutations) => {
                renderSettings();
            });

            // Следим за всем телом страницы, вдруг меню появится
            observer.observe(document.body, { childList: true, subtree: true });

            // Для надежности пробуем рисовать при клике на любую кнопку меню
            $(document).on('click', renderSettings);

            // 2. Слушаем начало генерации
            eventSource.on(event_types.GENERATION_STARTED, checkProbability);

            // 3. Добавляем промт
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

        } catch (e) {
            console.error("[Living World] CRITICAL ERROR:", e);
            if (typeof toastr !== 'undefined') toastr.error("Living World crashed. Check console.", "Error");
        }
    }, 1000);
});
