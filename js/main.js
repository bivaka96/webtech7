"use strict";

// Адрес API для Netlify / GitHub Pages
const DISHES_API_URL = "https://edu.std-900.ist.mospolytech.ru/labs/api/dishes";

// Приведение названий категорий из API к значениям data-category на странице
const CATEGORY_ALIASES = {
    "soup": "soup",
    "soups": "soup",
    "main-course": "main-course",
    "main_course": "main-course",
    "main": "main-course",
    "salad": "salad",
    "salads": "salad",
    "drink": "drink",
    "drinks": "drink",
    "beverages": "drink",
    "dessert": "dessert",
    "desserts": "dessert"
};

// Все блюда, загруженные с сервера
let dishes = [];

// Текст, который выводится в форме, если блюдо категории не выбрано
const EMPTY_TEXT = {
    "soup": "Блюдо не выбрано",
    "main-course": "Блюдо не выбрано",
    "salad": "Блюдо не выбрано",
    "drink": "Напиток не выбран",
    "dessert": "Десерт не выбран"
};

// Доступные комбо (наборы обязательных категорий). Десерт можно добавить к любому
const COMBOS = [
    ["soup", "main-course", "salad", "drink"],
    ["soup", "main-course", "drink"],
    ["soup", "salad", "drink"],
    ["main-course", "salad", "drink"],
    ["main-course", "drink"]
];

// Выбранные блюда: категория -> объект блюда
const selectedDishes = {};

function createDishCard(dish) {
    const card = document.createElement("div");
    card.className = "dish";
    card.dataset.dish = dish.keyword;
    card.dataset.kind = dish.kind;

    const image = document.createElement("img");
    image.className = "dish__image";
    image.src = dish.image;
    image.alt = dish.name;

    const price = document.createElement("p");
    price.className = "dish__price";
    price.textContent = `${dish.price}₽`;

    const name = document.createElement("p");
    name.className = "dish__name";
    name.textContent = dish.name;

    const count = document.createElement("p");
    count.className = "dish__count";
    count.textContent = dish.count;

    const button = document.createElement("button");
    button.className = "dish__button";
    button.type = "button";
    button.textContent = "Добавить";

    card.append(image, price, name, count, button);
    return card;
}

async function loadDishes() {
    const response = await fetch(DISHES_API_URL);
    if (!response.ok) {
        throw new Error(`Сервер ответил с кодом ${response.status}`);
    }
    const data = await response.json();
    return data.map((dish) => ({
        ...dish,
        category: CATEGORY_ALIASES[dish.category] || dish.category
    }));
}

function showLoadError(error) {
    const message = document.createElement("p");
    message.className = "load-error";
    message.textContent = `Не удалось загрузить меню: ${error.message}. Попробуйте обновить страницу позже.`;
    document.querySelector(".main").prepend(message);
}

function renderDishes() {
    const sorted = [...dishes].sort((a, b) => a.name.localeCompare(b.name, "ru"));

    sorted.forEach((dish) => {
        const container = document.querySelector(
            `.menu-section[data-category="${dish.category}"] .dishes`
        );
        if (container) {
            container.append(createDishCard(dish));
        }
    });
}

function updateOrderSummary() {
    const categories = Object.keys(EMPTY_TEXT);
    const hasSelection = categories.some((category) => selectedDishes[category]);
    let total = 0;

    document.querySelector(".order-summary__empty").hidden = hasSelection;

    categories.forEach((category) => {
        const item = document.querySelector(`.order-summary__item[data-category="${category}"]`);
        const value = item.querySelector(".order-summary__value");
        const input = document.querySelector(`.order-summary__input[data-category="${category}"]`);
        const dish = selectedDishes[category];

        item.hidden = !hasSelection;
        if (dish) {
            value.textContent = `${dish.name} ${dish.price}₽`;
            input.value = dish.keyword;
            total += dish.price;
        } else {
            value.textContent = EMPTY_TEXT[category];
            input.value = "";
        }
    });

    const totalBlock = document.querySelector(".order-summary__total");
    totalBlock.hidden = !hasSelection;
    totalBlock.querySelector(".order-summary__value").textContent = `${total}₽`;
}

function selectDish(keyword) {
    const dish = dishes.find((item) => item.keyword === keyword);
    if (!dish) {
        return;
    }

    selectedDishes[dish.category] = dish;

    const section = document.querySelector(`.menu-section[data-category="${dish.category}"]`);
    section.querySelectorAll(".dish").forEach((card) => {
        card.classList.toggle("dish_selected", card.dataset.dish === keyword);
    });

    updateOrderSummary();
}

function applyFilter(button) {
    const section = button.closest(".menu-section");
    const isActive = button.classList.contains("active");

    section.querySelectorAll(".filters__button").forEach((item) => {
        item.classList.remove("active");
    });
    if (!isActive) {
        button.classList.add("active");
    }

    const kind = isActive ? null : button.dataset.kind;
    section.querySelectorAll(".dish").forEach((card) => {
        card.hidden = kind !== null && card.dataset.kind !== kind;
    });
}

function getMissingDishesMessage() {
    const has = (category) => Boolean(selectedDishes[category]);
    const mainCategories = ["soup", "main-course", "salad", "drink"];
    const chosen = mainCategories.filter(has);

    if (!Object.keys(EMPTY_TEXT).some(has)) {
        return "Ничего не выбрано. Выберите блюда для заказа";
    }

    const isCombo = COMBOS.some((combo) => {
        return combo.length === chosen.length && combo.every((category) => chosen.includes(category));
    });
    if (isCombo) {
        return null;
    }

    if (has("soup") && !has("main-course") && !has("salad")) {
        return "Выберите главное блюдо/салат/стартер";
    }
    if (has("salad") && !has("soup") && !has("main-course")) {
        return "Выберите суп или главное блюдо";
    }
    if (!has("soup") && !has("main-course") && !has("salad")) {
        return "Выберите главное блюдо";
    }
    return "Выберите напиток";
}

function showNotification(message) {
    const overlay = document.createElement("div");
    overlay.className = "notification";
    overlay.setAttribute("role", "alertdialog");

    const text = document.createElement("p");
    text.className = "notification__text";
    text.textContent = message;

    const button = document.createElement("button");
    button.className = "notification__button";
    button.type = "button";
    button.textContent = "Окей 👌";
    button.addEventListener("click", () => overlay.remove());

    overlay.append(text, button);
    document.body.append(overlay);
    button.focus();
}

function handleOrderSubmit(event) {
    const message = getMissingDishesMessage();
    if (message) {
        event.preventDefault();
        document.querySelectorAll(".notification").forEach((item) => item.remove());
        showNotification(message);
    }
}

function resetSelection() {
    Object.keys(selectedDishes).forEach((category) => {
        delete selectedDishes[category];
    });
    document.querySelectorAll(".dish_selected").forEach((card) => {
        card.classList.remove("dish_selected");
    });
    updateOrderSummary();
}

document.addEventListener("DOMContentLoaded", async () => {
    updateOrderSummary();

    try {
        dishes = await loadDishes();
        renderDishes();
    } catch (error) {
        showLoadError(error);
    }

    document.querySelector(".main").addEventListener("click", (event) => {
        const filterButton = event.target.closest(".filters__button");
        if (filterButton) {
            applyFilter(filterButton);
            return;
        }

        const card = event.target.closest(".dish");
        if (card) {
            selectDish(card.dataset.dish);
        }
    });

    const form = document.querySelector(".order-form");
    form.addEventListener("reset", resetSelection);
    // Проверяем состав заказа до встроенной валидации полей формы
    form.querySelector("[type='submit']").addEventListener("click", handleOrderSubmit);
    form.addEventListener("submit", handleOrderSubmit);
});
