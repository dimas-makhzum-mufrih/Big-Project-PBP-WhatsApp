/**
 * NGUMPUL - Theme Manager
 * Mengelola Light Mode dan Dark Mode seluruh aplikasi.
 */

(function () {
    "use strict";

    const STORAGE_KEY = "ngumpul_tema";

    function getSavedTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved === "light" || saved === "dark") {
                return saved;
            }
        } catch (error) {
            console.warn("Gagal membaca tema:", error);
        }

        return "light";
    }

    function applyTheme(theme) {
        const selectedTheme = theme === "dark" ? "dark" : "light";

        document.documentElement.setAttribute(
            "data-theme",
            selectedTheme
        );

        document.documentElement.style.colorScheme = selectedTheme;

        // Sinkronisasi tombol tema jika tersedia.
        document.querySelectorAll("[data-theme-toggle]").forEach(button => {
            button.textContent = selectedTheme === "dark" ? "☀️" : "🌙";

            button.setAttribute(
                "aria-label",
                selectedTheme === "dark"
                    ? "Aktifkan Light Mode"
                    : "Aktifkan Dark Mode"
            );

            button.setAttribute(
                "aria-pressed",
                String(selectedTheme === "dark")
            );
        });

        return selectedTheme;
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            console.warn("Gagal menyimpan tema:", error);
        }
    }

    function setTheme(theme) {
        if (theme !== "light" && theme !== "dark") {
            return;
        }

        saveTheme(theme);
        applyTheme(theme);
    }

    function toggleTheme() {
        const currentTheme = getSavedTheme();

        setTheme(currentTheme === "dark" ? "light" : "dark");
    }

    // Terapkan tema ketika script dijalankan.
    applyTheme(getSavedTheme());

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("[data-theme-toggle]").forEach(button => {
            button.addEventListener("click", toggleTheme);
        });

        applyTheme(getSavedTheme());
    });

    // API untuk digunakan halaman lain.
    window.NgumpulTheme = {
        getTheme: getSavedTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme
    };

})();