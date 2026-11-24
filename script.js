
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

const timeButtons = document.querySelectorAll("[data-time]");

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

function selectCard(selector, selectedButton) {
    document.querySelectorAll(selector).forEach(button => {
        button.classList.remove("selected");
    });

    selectedButton.classList.add("selected");
}

document.querySelectorAll("[data-branch]").forEach(button => {
    button.addEventListener("click", () => {
        bookingData.branch = button.dataset.branch;
        selectCard("[data-branch]", button);
        showStep(2);
    });
});

document.querySelectorAll("[data-master]").forEach(button => {
    button.addEventListener("click", () => {
        bookingData.master = button.dataset.master;
        selectCard("[data-master]", button);
        showStep(3);
    });
});

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

function updateServiceSummary() {
    let totalPrice = 0;
    let totalDuration = 0;

    selectedServices.forEach(service => {
        totalPrice += service.price;
        totalDuration += service.duration;
    });

    selectedCount.textContent = selectedServices.size;
    selectedDetails.textContent = selectedServices.size
        ? `${totalDuration} мин`
        : "Услуги не выбраны";

    selectedTotal.textContent =
        `${totalPrice.toLocaleString("ru-RU")} ₽`;

    continueButton.disabled = selectedServices.size === 0;
}

continueButton.addEventListener("click", () => {
    if (!selectedServices.size) return;

    showStep(4);
    updateFinalSummary();
    updateTimeButtons();
});

function getToday() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function getMoscowMinutes() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Moscow",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return Number(values.hour) * 60 + Number(values.minute);
}

dateInput.min = getToday();

function updateTimeButtons() {
    const selectedDate = dateInput.value;
    const today = getToday();
    const nowMinutes = getMoscowMinutes();

    timeButtons.forEach(button => {
        const [hours, minutes] = button.dataset.time.split(":").map(Number);
        const slotMinutes = hours * 60 + minutes;

        const expired =
            !selectedDate ||
            selectedDate < today ||
            (selectedDate === today && slotMinutes <= nowMinutes);

        button.disabled = expired;

        if (expired) {
            button.classList.remove("selected");

            if (bookingData.time === button.dataset.time) {
                bookingData.time = "";
            }
        }
    });

    validateForm();
}

dateInput.addEventListener("change", () => {
    bookingData.date = dateInput.value;
    bookingData.time = "";

    document.querySelectorAll("[data-time]").forEach(button => {
        button.classList.remove("selected");
    });

    updateTimeButtons();
});

timeButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (button.disabled) return;

        bookingData.time = button.dataset.time;
        selectCard("[data-time]", button);
        validateForm();
    });
});

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

function validateForm() {
    const phone = phoneInput.value.replace(/\D/g, "");

    const valid =
        nameInput.value.trim().length >= 2 &&
        phone.length >= 10 &&
        dateInput.value &&
        dateInput.value >= getToday() &&
        bookingData.time &&
        selectedServices.size > 0;

    confirmButton.disabled = !valid;
}

[nameInput, phoneInput].forEach(input => {
    input.addEventListener("input", validateForm);
});

confirmButton.addEventListener("click", async () => {
    if (confirmButton.disabled) return;

    bookingData.name = nameInput.value.trim();
    bookingData.phone = phoneInput.value.trim();
    bookingData.date = dateInput.value;

    if (
        bookingData.date < getToday() ||
        (bookingData.date === getToday() &&
         timeToMinutes(bookingData.time) <= getMoscowMinutes())
    ) {
        alert("Это время уже прошло. Выбери другое.");
        updateTimeButtons();
        return;
    }

    let totalPrice = 0;
    let totalDuration = 0;

    selectedServices.forEach(service => {
        totalPrice += service.price;
        totalDuration += service.duration;
    });

    const services = Array.from(selectedServices.keys()).join(", ");

    confirmButton.disabled = true;
    confirmButton.textContent = "Отправляем...";

    try {
        const response = await fetch("/.netlify/functions/create-booking", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                branch: bookingData.branch,
                master: bookingData.master,
                services,
                date: bookingData.date,
                time: bookingData.time,
                name: bookingData.name,
                phone: bookingData.phone,
                price: totalPrice,
                duration: totalDuration
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Ошибка отправки");
        }

        alert("Заявка успешно отправлена!");
        confirmButton.textContent = "Заявка отправлена";

    } catch (error) {
        alert(error.message || "Не удалось отправить заявку");

        confirmButton.textContent = "ПОДТВЕРДИТЬ ЗАПИСЬ";
        validateForm();
    }
});

function timeToMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return -1;

    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
}

backButton.addEventListener("click", () => {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
});

showStep(1);
updateServiceSummary();
validateForm();

