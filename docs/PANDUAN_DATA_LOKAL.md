# Panduan Data Lokal Ngumpul

Aplikasi ini **tidak punya server dan database**. Semua data (akun, profil, sesi login, kode OTP, dan kontak) disimpan **di dalam browser** kamu sendiri. Panduan ini menjelaskan cara melihat, mengubah, dan menghapus data itu.

---

## 1. Cara menjalankan: wajib pakai Live Server

**Cara A: Live Server (DIANJURKAN)**
- Klik kanan `index.html` di VS Code, pilih **Open with Live Server** (atau tombol **Go Live** di bar bawah).
- Alamatnya seperti `http://127.0.0.1:5500/index.html`.
- Semua fitur jalan normal, termasuk hash sandi (SHA-256).

**Cara B: klik dua kali file (JANGAN)**
- Alamatnya diawali `file:///C:/...`.
- Hash sandi turun jadi base64 yang gampang dibaca balik, jadi tidak aman.
- Perilaku penyimpanan data tidak sama antar browser, jadi data bisa terlihat "hilang".

### Jebakan: data tiap alamat itu TERPISAH

Browser menyimpan data per **alamat lengkap (termasuk port)**. Alamat-alamat ini dianggap berbeda:

- `http://127.0.0.1:5500` dan `http://localhost:5500` (beda nama)
- `http://127.0.0.1:5500` dan `http://127.0.0.1:5501` (beda port)
- Live Server dan `file:///...` (beda cara buka)
- Jendela biasa dan jendela Incognito

Kalau akun yang sudah kamu daftarkan tiba-tiba "hilang", **cek dulu alamat di address bar-nya sama dengan waktu mendaftar.** Biasakan satu alamat saja untuk satu tim, yaitu `127.0.0.1:5500`. Jangan mengubah port lewat file pengaturan yang ikut ter-commit ke repo.

---

## 2. Cara melihat data (lewat DevTools)

1. Buka aplikasi di Chrome atau Edge lewat Live Server.
2. Tekan **F12** (atau Ctrl+Shift+I).
3. Buka tab **Application**. Kalau tidak kelihatan, klik tanda `»` di deretan tab.
4. Di panel kiri, cari bagian **Storage**:
   - **Local Storage**, lalu klik alamatmu. Ini data yang awet.
   - **Session Storage**, lalu klik alamatmu. Ini data sementara per tab.
5. Klik satu baris untuk melihat isinya di bagian bawah.

**Hapus lewat tampilan (tanpa mengetik):**
- Klik satu baris, tekan **Delete** di keyboard, atau klik kanan lalu **Delete**.
- Ikon **🚫 (Clear all)** di atas daftar menghapus semua data di alamat itu.

---

## 3. Daftar data yang dipakai sekarang

**Local Storage (awet, dipakai bersama semua tab)**
- `ngumpul_users`: semua akun terdaftar. Tiap akun berisi `id`, `nama`, `hp` (format internasional, misalnya `+62812...`), `negara`, `email`, `sandi` (sudah di-hash), `dibuat`.
- `ngumpul_terverifikasi`: akun yang sudah lolos OTP. Kuncinya adalah **digit nomor HP internasional tanpa tanda +**.
- `ngumpul_profil`: profil **per akun**, berbentuk `{ idAkun: { nama, username, bio, phone } }`. Profil yang belum diisi otomatis diambil dari data akun.
- `ngumpul_kontak_<idAkun>`: daftar kontak untuk akun tersebut, disimpan di browser sebagai `{ phone, name }`. Kontak dicari berdasarkan nomor internasional, sehingga akun yang mendaftar kemudian akan terhubung otomatis.

**Session Storage (sementara, per tab)**
- `ngumpul_sesi`: **id akun yang sedang login di tab ini.** Tab yang ditutup berarti logout.
- `ngumpul_pending`: data pendaftaran yang menunggu OTP.
- `ngumpul_otp`: kode OTP yang sedang aktif (`kode`, `dibuat`, `salah`).
- `draft_profil_edit`: draf isian halaman Edit Profil sebelum disimpan.

**Sisa data lama (tidak dipakai lagi, boleh dihapus)**
- `user_nama_profil`, `user_username_profil`, `user_bio_profil`, `user_phone_profil`. Itu penyimpanan profil versi lama yang berlaku untuk semua akun sekaligus.

Aturan buat semua fitur baru: kunci data diberi awalan **`ngumpul_<nama-fitur>`**, misalnya `ngumpul_pesan`. Jangan menulis ke kunci milik fitur lain.

---

## 4. Cara kerja login dan sesi

- **Login memeriksa akun.** Email atau nomor HP dan sandi dicocokkan ke `ngumpul_users`. Pesan salahnya sengaja disamakan ("Akun tidak ditemukan atau sandi salah").
- **Akun yang belum verifikasi** otomatis diarahkan ke halaman OTP.
- **Sesi per tab.** Dua tab bisa login sebagai dua akun berbeda sekaligus, dan keduanya berbagi data yang sama di Local Storage. Ini yang dipakai untuk tes kirim pesan antar akun.
- **Dashboard dan halaman profil dijaga.** Kalau di tab itu tidak ada `ngumpul_sesi`, kamu dilempar ke halaman login.
- **Keluar akun hanya menghapus sesi.** Data akun dan profil tetap aman.

### Untuk anggota yang membuat halaman atau fitur baru

1. Muat `storage.js` **sebelum** script halamanmu:
   ```html
   <script src="../../assets/js/storage.js"></script>
   <script src="halamanku.js"></script>
   ```
2. Di awal script halamanmu, minta halaman yang butuh login untuk memeriksa sesi:
   ```js
   const user = getUserAktif();
   if (!user) { location.replace('../auth/login.html'); }
   ```
3. Jangan baca `localStorage` akun secara langsung. Pakai fungsi dari `storage.js`:
   - `getUserAktif()`: akun yang sedang login (atau `null`).
   - `getUserById(id)`: cari akun berdasarkan id.
   - `getProfil(id)` dan `simpanProfil(id, data)`: profil per akun.
   - `hapusSesi()`: logout tab ini.

---

## 5. Perintah Console

Buka tab **Console** di DevTools (F12), ketik perintahnya, lalu tekan Enter.

> Kalau muncul peringatan saat paste, ketik `allow pasting` lalu Enter, baru paste lagi.

### Melihat data

- Semua akun dalam bentuk tabel:
  ```js
  console.table(JSON.parse(localStorage.getItem('ngumpul_users')))
  ```
- Jumlah akun:
  ```js
  JSON.parse(localStorage.getItem('ngumpul_users') || '[]').length
  ```
- Semua profil:
  ```js
  console.log(JSON.parse(localStorage.getItem('ngumpul_profil')))
  ```
- Id akun yang sedang login di tab ini:
  ```js
  sessionStorage.getItem('ngumpul_sesi')
  ```
- Semua kunci yang tersimpan:
  ```js
  Object.keys(localStorage)
  Object.keys(sessionStorage)
  ```
- Kode OTP yang sedang aktif (berguna kalau notifikasinya sudah hilang):
  ```js
  JSON.parse(sessionStorage.getItem('ngumpul_otp'))
  ```

### Menghapus data

- Logout tab ini secara manual:
  ```js
  sessionStorage.removeItem('ngumpul_sesi')
  ```
- Hapus **satu akun** berdasarkan email (ganti emailnya, pakai huruf kecil):
  ```js
  var u = JSON.parse(localStorage.getItem('ngumpul_users') || '[]'); localStorage.setItem('ngumpul_users', JSON.stringify(u.filter(function (x) { return x.email !== 'email@contoh.com'; })))
  ```
- Hapus profil **satu akun** (ganti `ID_AKUN` dengan `id` dari tabel akun):
  ```js
  var p = JSON.parse(localStorage.getItem('ngumpul_profil') || '{}'); delete p['ID_AKUN']; localStorage.setItem('ngumpul_profil', JSON.stringify(p))
  ```
- Hapus **semua akun**:
  ```js
  localStorage.removeItem('ngumpul_users')
  ```
- Hapus semua profil:
  ```js
  localStorage.removeItem('ngumpul_profil')
  ```
- Hapus status verifikasi:
  ```js
  localStorage.removeItem('ngumpul_terverifikasi')
  ```
- Hapus data pendaftaran dan OTP sementara:
  ```js
  sessionStorage.removeItem('ngumpul_pending'); sessionStorage.removeItem('ngumpul_otp')
  ```
- Hapus sisa data lama (profil versi global):
  ```js
  ['user_nama_profil','user_username_profil','user_bio_profil','user_phone_profil'].forEach(function (k) { localStorage.removeItem(k) })
  ```
- **Reset total** (hapus SEMUA data di alamat itu, termasuk milik fitur lain):
  ```js
  localStorage.clear(); sessionStorage.clear()
  ```

Setelah menghapus, **refresh halaman** (F5).

---

## 6. Masalah yang sering muncul

- **"Email atau nomor HP ini sudah terdaftar" padahal mau daftar ulang.**
  Akunnya masih ada di penyimpanan. Hapus lewat perintah di bagian 5.
- **Login bilang "Akun tidak ditemukan atau sandi salah".**
  Cek apakah akunnya ada di `ngumpul_users` (lihat tabel di bagian 5). Kalau tidak ada, cek alamat dan port di address bar, atau daftar ulang.
- **Setelah login malah dilempar ke halaman OTP.**
  Akun itu belum tercatat di `ngumpul_terverifikasi`. Selesaikan OTP-nya. Akun yang didaftarkan sebelum format nomor diseragamkan juga bisa begini, dan solusinya reset total lalu daftar ulang.
- **Dashboard langsung melempar ke halaman login.**
  Tab itu tidak punya `ngumpul_sesi`, misalnya tab baru atau tab yang pernah ditutup. Login lagi di tab itu.
- **Nama profil masih disensor (`A*** R*****`) atau titik tiga di dashboard tidak bisa diklik.**
  Biasanya `storage.js` belum dimuat di halaman itu. Buka Console, kalau ada tulisan merah `getUserAktif is not defined`, tambahkan `<script src="../../assets/js/storage.js"></script>` sebelum script halamannya.
- **Akun yang tadi dibuat hilang.**
  Cek alamat dan port (lihat bagian 1). Hampir selalu penyebabnya ini.
- **Kode OTP tidak muncul.**
  Notifikasinya hanya tampil sekitar 8 detik. Lihat kodenya lewat perintah "kode OTP yang sedang aktif", atau tekan kirim ulang.
- **Tampilan tidak berubah setelah file diganti.**
  Tekan **Ctrl+Shift+R** untuk refresh tanpa cache.
- **Mau tes dua akun sekaligus (misalnya kirim pesan A ke B).**
  Buka akun pertama di satu tab dan akun kedua di tab lain (sesi login terpisah per tab). Atau pakai Chrome dan Edge.

---

## 7. Batasan yang masih ada

- Data hanya ada di browser tempat akun dibuat. Laptop lain tidak bisa melihatnya.
- OTP hanya simulasi. Kodenya ditampilkan di layar, bukan dikirim lewat SMS.
- Nomor telepon di halaman Edit Profil belum divalidasi.
- Foto profil, banner, dan tautan media sosial belum tersimpan.
- Tema gelap dan terang punya kunci sendiri dan belum terdokumentasi di sini (menunggu fitur tema selesai).
