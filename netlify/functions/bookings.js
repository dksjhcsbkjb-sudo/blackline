
exports.handler = async (event) => {
    try {
        const password = process.env.ADMIN_PASSWORD;
        const auth = event.headers.authorization || "";

        if (!password || auth !== `Bearer ${password}`) {
            return {
                statusCode: 401,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Доступ запрещён" })
            };
        }

        const token = process.env.NETLIFY_AUTH_TOKEN;
        const siteId = process.env.BLACKLINE_SITE_ID;

        if (!token || !siteId) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Настройки Netlify не найдены" })
            };
        }

        const headers = {
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`Netlify API: ${response.status}`);
        }

        const forms = await response.json();
        const form = forms.find(
            item => item.name === "blackline-booking"
        );

        if (!form) {
            return {
                statusCode: 200,
                body: JSON.stringify({ bookings: [] })
            };
        }

        const result = await fetch(
            `https://api.netlify.com/api/v1/forms/${form.id}/submissions`,
            { headers }
        );

        if (!result.ok) {
            throw new Error(`Submissions API: ${result.status}`);
        }

        const bookings = await result.json();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store"
            },
            body: JSON.stringify({ bookings })
        };

    } catch (error) {
        console.error("Bookings function error:", error.message);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Не удалось загрузить записи"
            })
        };
    }
};
