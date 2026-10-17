# Nama Aplikasi (WhatsApp)

Proyek akhir mata kuliah Pemrograman Berbasis Platform (PBP).
Aplikasi chat berbasis web, nanti di-convert ke mobile dan desktop.

## Struktur Folder

| Folder / File        | Fungsi                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `assets/css/`        | File tampilan (style)                                               |
| `assets/js/`         | File JavaScript (logika di sisi browser)                            |
| `assets/img/`        | Gambar bawaan aplikasi (logo, ikon, dll)                            |
| `pages/`             | Halaman aplikasi: login, chat, status, profil                       |
| `config/`            | Pengaturan, misal koneksi database. **Jangan commit password asli** |
| `uploads/`           | Gambar yang dikirim user. Isinya **tidak ikut di-upload** ke GitHub |
| `.gitignore`         | Daftar file yang tidak ikut ke GitHub (hanya leader yang edit)      |
| `README.md`          | Halaman depan repo ini (hanya leader yang edit)                     |
| `PANDUAN_ANGGOTA.md` | Panduan Git & aturan kerja tim. **Wajib dibaca**                    |

> Struktur ini bisa berubah menyesuaikan stack yang dipakai. Kalau ada perubahan, leader yang update tabel ini.

## Cara Menjalankan

1. Clone repo: `git clone <link-repo>`
2. Masuk ke folder: `cd nama-repo`
3. Setup: `...`
4. Jalankan: `...`

## Aturan Kontribusi

- Baca `PANDUAN_ANGGOTA.md` sebelum mulai kerja
- Kerja di branch sendiri (`nama-fitur`), jangan di `main`
- Semua perubahan lewat Pull Request, merge hanya oleh leader
- Ada ide atau mau ubah struktur → tanya leader dulu
