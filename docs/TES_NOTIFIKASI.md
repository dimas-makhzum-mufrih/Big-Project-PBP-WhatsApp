# Cara tes notifikasi (dan fitur dua akun)

## Syarat (kalau tidak terpenuhi, notifikasi tidak akan pernah muncul)
1. Buka lewat **http://localhost:PORT** (Live Server) atau HTTPS. Lewat `http://192.168.x.x` toggle notifikasi nonaktif dan tertulis "Koneksi belum mendukung notifikasi".
2. Izin notifikasi browser harus **Allow**. Kalau pernah klik Block: ikon gembok di address bar, Notifications, Allow, lalu muat ulang.
3. Pengirim harus **ada di kontak penerima** (notifikasi pesan pribadi hanya untuk kontak tersimpan).
4. Penerima **tidak sedang melihat** chat pengirim itu (tab lain, jendela tidak fokus, chat lain terbuka, atau panel Pengaturan terbuka).
5. Toggle di Pengaturan, Notifikasi harus **Aktif** (disimpan per akun).

## Siapkan dua akun (1 menit)
1. Buka `pages/demo/demo.html`, klik **Isi data contoh**.
2. Klik **Buka** pada Arif, lalu **Buka** pada Zaka. Dua tab, dua akun. Jangan pakai Duplicate tab.

## Checklist manual
| # | Langkah | Hasil yang benar |
|---|---|---|
| 1 | Tab Zaka: titik tiga, Pengaturan, Notifikasi, nyalakan toggle, Allow | Status "Aktif" |
| 2 | Kembali ke chat Zaka, jangan buka chat Arif. Pindah ke tab Arif (atau minimalkan jendela Zaka), kirim pesan ke Zaka | Dalam ±2 detik muncul notifikasi sistem "Ngumpul · Arif Fathur" berisi pesan. Badge angka di tab Chat Zaka |
| 3 | Kirim 3 pesan cepat | Satu notifikasi "3 pesan baru: ..." per percakapan (tag sama, tidak menumpuk) |
| 4 | Klik notifikasi | Jendela Zaka fokus dan chat Arif terbuka |
| 5 | Zaka membuka chat Arif (jendela fokus), Arif kirim pesan | **Tidak** ada notifikasi, pesan langsung terbaca |
| 6 | Hapus Arif dari kontak Zaka, Arif kirim pesan | Tidak ada notifikasi |
| 7 | Arif buat grup berisi Zaka, kirim pesan di channel | Zaka dapat notifikasi "Ngumpul · nama grup" berisi "Arif Fathur: ..." |
| 8 | Zaka mute grup, Arif kirim pesan | Tidak ada notifikasi |
| 9 | Arif masuk channel suara atau menelepon, jendela Zaka tidak fokus | Notifikasi "Panggilan grup" |
| 10 | Zaka matikan toggle, Arif kirim pesan | Tidak ada notifikasi |
| 11 | Zaka tutup tab, buka lagi | Pesan lama tidak memicu notifikasi ulang (riwayat per akun) |

Catatan: langkah 3, 4, 8, 9, dan 11 disusun dari membaca kode `notifikasi.js` dan belum diuji otomatis (klik notifikasi sistem tidak bisa disimulasikan). Coba manual dan laporkan kalau hasilnya beda.

Tips: untuk langkah 2, notifikasi **tidak muncul kalau jendela penerima sedang fokus dan chat pengirim terbuka**. Itu benar, bukan bug. Mode Focus/Jangan Ganggu di Windows/macOS juga menyembunyikan notifikasi sistem.

## Tes otomatis (opsional)
```
npm i -D playwright
npx playwright install chromium
node docs/tes/tes-notifikasi.js .
```
Memeriksa 8 hal: toggle, notifikasi pesan pribadi, badge, tidak ada notifikasi saat chat terbuka, pengirim bukan kontak, notifikasi grup, dan toggle dimatikan. Hasil terakhir: 8/8 lolos.
