
let currentStep = 1;

const bookingData = {
    branch: "",
    master: "",
    date: "",
    time: "",
    name: "",
    phone: ""
};

const selectedServices = new Map();

const screens = document.querySelectorAll(".booking-screen");
const progress = document.querySelectorAll(".booking-progress span");

const backButton = document.getElementById("back-button");
const continueButton = document.getElementById("continue-services");
const confirmButton = document.getElementById("confirm-booking");

const dateInput = document.getElementById("booking-date");
const nameInput = document.getElementById("client-name");
const phoneInput = document.getElementById("client-phone");

const selectedCount = document.getElementById("selected-count");
const selectedDetails = document.getElementById("selected-details");
const selectedTotal = document.getElementById("selected-total");
const finalSummary = document.getElementById("final-summary");

// Показ нужного шага
function showStep(step) {
    currentStep = step;

    screens.forEach((screen, index) => {
        screen.classList.toggle("active-screen", index === step - 1);
    });

    progress.forEach((item, index) => {
        item.classList.toggle("active", index < step);
    });

    backButton.hidden = step === 1;
}

// Выбор филиала
document.querySelectorAll("[data-branch]").forEach(button => {
    button.addEventListener("click", () => {
        bookingData.branch = button.dataset.branch;

        selectCard("[data-branch]", button);
        showStep(2);
    });
});

// Выбор мастера
document.querySelectorAll("[data-master]").forEach(button => {
    button.addEventListener("click", () => {
        bookingData.master = button.dataset.master;

        selectCard("[data-master]", button);
        showStep(3);
    });
});

// Выбор услуг
document.querySelectorAll(".service-option").forEach(button => {
    button.addEventListener("click", () => {
        const name = button.dataset.service;
        const price = Number(button.dataset.price);
        const duration = Number(button.dataset.duration);

        if (selectedServices.has(name)) {
            selectedServices.delete(name);
            button.classList.remove("selected");
        } else {
            selectedServices.set(name, { price, duration });
            button.classList.add("selected");
        }

        updateServiceSummary();
    });
});

// Выделение выбранной карточки
function selectCard(selector, selectedButton) {
    document.querySelectorAll(selector).forEach(button => {
        button.classList.remove("selected");
    });

    selectedButton.classList.add("selected");
}

// Обновление информации об услугах
function updateServiceSummary() {
    let totalPrice = 0;
    let totalDuration = 0;

    selectedServices.forEach(service => {
        totalPrice += service.price;
        totalDuration += service.duration;
    });

    selectedCount.textContent = selectedServices.size;

    selectedDetails.textContent =
        selectedServices.size > 0
            ? `${totalDuration} мин`
            : "Услуги не выбраны";

    selectedTotal.textContent = `${totalPrice.toLocaleString("ru-RU")} ₽`;

    continueButton.disabled = selectedServices.size === 0;
}

// Переход к выбору даты
continueButton.addEventListener("click", () => {
    if (selectedServices.size === 0) return;

    showStep(4);
    updateFinalSummary();
});

// Минимальная дата — сегодня
if (dateInput) {
    const today = new Date();
    const localDate = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    dateInput.min = localDate;
}

// Выбор времени
document.querySelectorAll("[data-time]").forEach(button => {
    button.addEventListener("click", () => {
        bookingData.time = button.dataset.time;
        selectCard("[data-time]", button);
        validateForm();
    });
});

// Обновление итоговой информации
function updateFinalSummary() {
    const services = Array.from(selectedServices.keys()).join(", ");

    let totalPrice = 0;
    let totalDuration = 0;

    selectedServices.forEach(service => {
        totalPrice += service.price;
        totalDuration += service.duration;
    });

    finalSummary.textContent =
        `Филиал: ${bookingData.branch} | ` +
        `Мастер: ${bookingData.master} | ` +
        `Услуги: ${services} | ` +
        `Время: ${totalDuration} мин | ` +
        `Стоимость: ${totalPrice.toLocaleString("ru-RU")} ₽`;
}

// Проверка заполнения
function validateForm() {
    const phone = phoneInput.value.replace(/\D/g, "");

    const valid =
        nameInput.value.trim().length >= 2 &&
        phone.length >= 10 &&
        dateInput.value &&
        bookingData.time;

    confirmButton.disabled = !valid;
}

[nameInput, phoneInput, dateInput].forEach(input => {
    input.addEventListener("input", validateForm);
    input.addEventListener("change", validateForm);
});

// Отправка заявки через Netlify Forms
confirmButton.addEventListener("click", async () => {
    if (confirmButton.disabled) return;

    bookingData.name = nameInput.value.trim();
    bookingData.phone = phoneInput.value.trim();
    bookingData.date = dateInput.value;

    let totalPrice = 0;
    let totalDuration = 0;

    selectedServices.forEach(service => {
        totalPrice += service.price;
        totalDuration += service.duration;
    });

    const services = Array.from(selectedServices.keys()).join(", ");

    const formData = new URLSearchParams();

    formData.append("form-name", "blackline-booking");
    formData.append("branch", bookingData.branch);
    formData.append("master", bookingData.master);
    formData.append("services", services);
    formData.append("date", bookingData.date);
    formData.append("time", bookingData.time);
    formData.append("name", bookingData.name);
    formData.append("phone", bookingData.phone);
    formData.append("price", String(totalPrice));
    formData.append("duration", String(totalDuration));

    confirmButton.disabled = true;
    confirmButton.textContent = "Отправляем...";

    try {
        const response = await fetch("/booking.html", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        });

        if (!response.ok) {
            throw new Error("Ошибка отправки заявки");
        }

        alert("Заявка успешно отправлена!");

        confirmButton.textContent = "Заявка отправлена";
    } catch (error) {
        alert("Не удалось отправить заявку. Попробуй ещё раз.");

        confirmButton.textContent = "Подтвердить запись";
        validateForm();
    }
});

// Кнопка назад
backButton.addEventListener("click", () => {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
});

// Запуск
showStep(1);
updateServiceSummary();
validateForm();
