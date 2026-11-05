"use strict";

// Elemen menu utama
const triggerMenuUtama = document.getElementById("trigger-menu-utama");
const boxDropdownUtama = document.getElementById("box-dropdown-utama");
const optBukaSetelan = document.getElementById("opt-buka-setelan");

const panelLayerSetelan = document.getElementById("panel-layer-setelan");
const btnKembaliKeChat = document.getElementById("btn-kembali-ke-chat");

const daftarPengaturan = document.querySelector(".settings-list-flow");
const panelPengaturanTema = document.getElementById("panel-pengaturan-tema");
const judulPanelSetelan = document.getElementById("judul-panel-setelan");

const tombolPilihanTema = document.querySelectorAll("[data-set-theme]");
const menuTema = document.querySelector('[data-fitur="tema"]');

// Membuka dan menutup menu titik tiga
triggerMenuUtama.addEventListener("click", e => {
    e.stopPropagation();

    boxDropdownUtama.style.display =
        boxDropdownUtama.style.display === "none" ? "block" : "none";
});

document.addEventListener("click", () => {
    boxDropdownUtama.style.display = "none";
});

// Membuka pengaturan
optBukaSetelan.addEventListener("click", () => {
    panelLayerSetelan.style.display = "flex";

    daftarPengaturan.style.display = "block";
    panelPengaturanTema.hidden = true;

    judulPanelSetelan.textContent = "Pengaturan";

    boxDropdownUtama.style.display = "none";
});

// Membuka halaman Tema & Tampilan
function bukaPengaturanTema() {
    daftarPengaturan.style.display = "none";
    panelPengaturanTema.hidden = false;

    judulPanelSetelan.textContent = "Tema & Tampilan";
}

menuTema.addEventListener("click", bukaPengaturanTema);

menuTema.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        bukaPengaturanTema();
    }
});

// Kembali ke halaman sebelumnya
btnKembaliKeChat.addEventListener("click", () => {

    if (!panelPengaturanTema.hidden) {
        panelPengaturanTema.hidden = true;
        daftarPengaturan.style.display = "block";

        judulPanelSetelan.textContent = "Pengaturan";

    } else {
        panelLayerSetelan.style.display = "none";
    }

});

// Memperbarui tampilan pilihan tema
function perbaruiPilihanTema() {

    const temaAktif = window.NgumpulTheme.getTheme();

    tombolPilihanTema.forEach(button => {

        const temaButton = button.dataset.setTheme;
        const aktif = temaButton === temaAktif;

        button.classList.toggle("aktif", aktif);

        button.setAttribute("aria-pressed", String(aktif));

    });
}

// Memilih tema
tombolPilihanTema.forEach(button => {

    button.addEventListener("click", () => {

        const tema = button.dataset.setTheme;

        window.NgumpulTheme.setTheme(tema);

        perbaruiPilihanTema();

    });

});

// Inisialisasi pilihan tema
perbaruiPilihanTema();

// Keluar akun
document.getElementById("btn-keluar-akun").addEventListener("click", () => {

    try {

        // Pertahankan preferensi tema ketika keluar.
        const temaTersimpan = localStorage.getItem("ngumpul-theme");

        localStorage.clear();

        if (temaTersimpan) {
            localStorage.setItem("ngumpul-theme", temaTersimpan);
        }

        sessionStorage.clear();

    } catch (error) {
        console.warn("Gagal membersihkan penyimpanan:", error);
    }

    window.location.href = "../../index.html?splash=none";

});