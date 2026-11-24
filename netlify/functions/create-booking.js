
const SITE_URL = "https://blackline-msk.netlify.app";

exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
    };

    const reply = (statusCode, data) => ({
        statusCode,
        headers,
        body: JSON.stringify(data)
    });

    try {
        if (event.httpMethod !== "POST") {
            return reply(405, { error: "Метод не поддерживается" });
        }

        const booking = JSON.parse(event.body || "{}");

        const {
            branch, master, services, date, time,
            name, phone, price, duration
        } = booking;

        if (
            !branch || !master || !services || !date || !time ||
            !name || !phone ||
            !Number.isFinite(Number(duration)) ||
            Number(duration) <= 0
        ) {
            return reply(400, { error: "Заполни все поля" });
        }

        // Проверяем прошедшее время по Москве
        const now = new Date();
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Moscow",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).formatToParts(now);

        const current = Object.fromEntries(
            parts.map(part => [part.type, part.value])
        );

        const today = `${current.year}-${current.month}-${current.day}`;
        const selected = `${date}T${time}`;
        const currentTime =
            `${today}T${current.hour}:${current.minute}`;

        if (selected <= currentTime) {
            return reply(409, { error: "Это время уже прошло" });
        }

        const token = process.env.NETLIFY_AUTH_TOKEN;
        const siteId = process.env.BLACKLINE_SITE_ID;

        if (!token || !siteId) {
            throw new Error("Не настроены переменные Netlify");
        }

        const apiHeaders = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };

        const formsResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
            { headers: apiHeaders }
        );

        if (!formsResponse.ok) {
            throw new Error("Не удалось получить формы");
        }

        const forms = await formsResponse.json();
        const form = forms.find(
            item => item.name === "blackline-booking"
        );

        if (!form) {
            throw new Error("Форма записи не найдена");
        }

        const submissionsResponse = await fetch(
            `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=100`,
            { headers: apiHeaders }
        );

        if (!submissionsResponse.ok) {
            throw new Error("Не удалось проверить записи");
        }

        const submissions = await submissionsResponse.json();

        const start = timeToMinutes(time);
        const end = start + Number(duration);

        const conflict = submissions.some(item => {
            const data = item.data || {};

            if (
                data.branch !== branch ||
                data.master !== master ||
                data.date !== date
            ) return false;

            const oldStart = timeToMinutes(data.time);
            const oldDuration = Number(data.duration) || 0;
            const oldEnd = oldStart + oldDuration;

            return start < oldEnd && oldStart < end;
        });

        if (conflict) {
            return reply(409, {
                error: "Это время уже занято. Выбери другое."
            });
        }

        const formData = new URLSearchParams();
        formData.append("form-name", "blackline-booking");

        for (const [key, value] of Object.entries(booking)) {
            formData.append(key, String(value));
        }

        const saveResponse = await fetch(
            `${SITE_URL}/booking.html`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            }
        );

        if (!saveResponse.ok) {
            throw new Error("Netlify не сохранил заявку");
        }

        return reply(200, { success: true });

    } catch (error) {
        console.error("Create booking error:", error.message);
        return reply(500, {
            error: "Ошибка сервера. Попробуй позже."
        });
    }
};

function timeToMinutes(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return -1;

    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
}
