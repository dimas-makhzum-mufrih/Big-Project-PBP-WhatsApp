# Peta Kode Ngumpul

Semua pakai `<script>` biasa (tanpa module), jadi **urutan load penting**. Variabel/fungsi top-level dibagi antar file.

## assets/js (dipakai banyak halaman)
- storage.js: data user, sesi, profil, `bacaMedia`, `KUNCI_MEDIA`, `KUNCI_SOSMED` (SATU-SATUNYA tempat definisinya)
- theme.js: tema terang/gelap (`NgumpulTheme`)
- negara-data.js / negara.js: daftar negara + pemilih kode negara
- awal.js, foto.js, splash.js, register.js, hubung-otp.js: landing + daftar

## pages/dashboard
HTML memuat berurutan (dulu satu file dashboard.js 2.500 baris, isinya TIDAK diubah, hanya dipotong):
1. js/kontak-data.js: `NgumpulKontakData`
2. js/chat-data.js: konstanta chat, IndexedDB gambar, simpan/baca pesan, blokir, pin, status pesan
3. js/chat-tampil.js: daftar chat, isi pesan, cari pesan, `bukaChat`
4. js/chat-footer.js: panel lampiran, tombol kirim
5. js/chat-gambar.js: kirim gambar (antrean, preview, drag-drop, paste)
6. js/lightbox.js: peninjau gambar penuh
7. js/chat-aksi.js: blokir, simpan kontak, info pengguna, event `ngumpul:buka-chat`, tab Chat/Kontak
8. js/setelan.js: menu titik tiga, panel setelan, tema, logout, kartu profil
9. js/notifikasi.js: pengaturan notifikasi (butuh variabel dari chat-* dan setelan)
10. js/kontak.js: tab Kontak

CSS (urutan link = urutan cascade): dashboard.css (kerangka, tab, daftar chat) → chat.css → setelan.css → media.css; kontak.css dimuat paling awal.

## Catatan
- Cari bug: lihat nama fitur di atas, buka 1 file saja.
- Kirim ke Claude cukup file yang relevan + storage.js.
