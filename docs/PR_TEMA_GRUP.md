# Tema untuk grup, panggilan dari kontak, dan info profil baru

## Ringkasan
- **Tema ikut ke grup/server.** Ruang channel, header, composer, kartu intro, sidebar channel, dan layar panggilan sekarang memakai gaya tema (Pastel Party dengan grid dan garis tebal, Nebula dengan bintang berlapis, Lotus dengan kolam, Terminal, Rainy, dll). Dibuat otomatis dari gaya chat pribadi lewat `assets/css/tema-grup.css` (alias selektor), jadi tema baru ikut tanpa kerja dobel.
- **Latar hidup dan efek kirim juga jalan di ruang grup** (`tema-efek.js` dipasang ke ruang chat pribadi dan ruang grup).
- **Perbaikan bintang jatuh Nebula/Supernova/Stardust:** kepala bintang sekarang di depan arah jatuh dan ekornya memudar (sebelumnya terbalik). Muncul 3 bintang berurutan.
- **Telepon dan video call dari daftar kontak dan info profil.** Tombol "Segera hadir" diganti tombol Telepon/Video yang berfungsi. Memakai mesin panggilan grup yang sama lewat ruang tersembunyi 1-lawan-1 (`pribadi_<idA>_<idB>`, tidak muncul di daftar grup).
- **Info profil (panel kanan) dirombak:** banner, username, tanggal bergabung, aksi cepat (Chat, Suara, Video, Blokir), tombol salin nomor, statistik percakapan, tautan media sosial, foto bersama, tautan yang dibagikan, grup bersama.
- **Kartu kontak** dirombak: avatar membuka profil, tombol bulat berikon, mengikuti tema.

## File
- Baru: `assets/css/tema-grup.css`, `pages/dashboard/css/profil-kontak.css`
- Diubah: `assets/js/theme.js`, `assets/js/tema-efek.js`, `assets/css/tema-gaya.css`, `pages/dashboard/js/{kontak,info-kontak,grup,grup-dasar}.js`
- `dashboard.html` tidak diubah. CSS tambahan dimuat dari JS (`kontak.js` dan `theme.js`).

## Cara uji
1. Pilih tema premium, buka tab Grup, buat grup, buka channel teks: latar, bubble, header, composer mengikuti tema. Kirim pesan: efek kirim muncul.
2. Tab Kontak: tombol Telepon/Video aktif. Buka dua akun di dua tab (demo), telepon dari satu akun: tab lain menampilkan panggilan masuk, Terima, keduanya tersambung.
3. Klik avatar kontak: panel info profil baru. Coba Blokir/Buka blokir dan Salin.
4. Pastikan ruang panggilan pribadi tidak muncul di daftar grup.
5. Ganti Penuh/Ringan/Polos dan Objek Sembunyi di Pengaturan Tema: berlaku juga di grup.

## Catatan
- Mic/kamera butuh localhost atau HTTPS.
- Ruang panggilan pribadi disimpan di `ngumpul_grup` dengan `pribadi: true`; saat backend jadi, cukup endpoint "buka/buat ruang panggilan antar dua user" (lihat docs/backend).
- Perubahan di `grup.js`/`grup-dasar.js` kecil (filter `pribadi`, `grupPribadi()`, `panggilPribadi()`, label panggilan masuk); jika ada konflik, tiga bagian itu yang perlu dijaga.
