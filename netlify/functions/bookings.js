
exports.handler = async (event) => {
    try {
        // Проверяем пароль администратора
        const password = process.env.ADMIN_PASSWORD;
        const auth = event.headers?.authorization || "";

        if (!password || auth !== `Bearer ${password}`) {
            return {
                statusCode: 401,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Доступ запрещён"
                })
            };
        }

        // Получаем настройки Netlify
        const token = process.env.NETLIFY_AUTH_TOKEN;
        const siteId = process.env.BLACKLINE_SITE_ID;

        if (!token || !siteId) {
            throw new Error("Не найдены NETLIFY_AUTH_TOKEN или BLACKLINE_SITE_ID");
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        };

        // Получаем список форм сайта
        const formsResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
            { headers }
        );

        if (!formsResponse.ok) {
            const details = await formsResponse.text();
            throw new Error(
                `Forms API: ${formsResponse.status} ${details}`
            );
        }

        const forms = await formsResponse.json();

        // Ищем форму записи BLACKLINE
        const form = forms.find(
            item => item.name === "blackline-booking"
        );

        if (!form) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                },
                body: JSON.stringify({
                    bookings: []
                })
            };
        }

        // Получаем заявки из найденной формы
        const submissionsResponse = await fetch(
            `https://api.netlify.com/api/v1/forms/${form.id}/submissions`,
            { headers }
        );

        if (!submissionsResponse.ok) {
            const details = await submissionsResponse.text();
            throw new Error(
                `Submissions API: ${submissionsResponse.status} ${details}`
            );
        }

        const bookings = await submissionsResponse.json();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
            },
            body: JSON.stringify({
                bookings
            })
        };

    } catch (error) {
        console.error("Bookings function error:", error.message);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: "Не удалось загрузить записи"
            })
        };
    }
};
