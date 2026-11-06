# Panduan Masalah Git (Problem Solving)

Kumpulan masalah Git yang **benar-benar pernah terjadi** di proyek ini, lengkap dengan gejala, penyebab, dan cara membereskannya. Baca bagian "Aturan emas" dulu, lalu cari masalahmu di daftar.

Semua perintah dijalankan di **Terminal VS Code** (PowerShell) di folder proyek.

---

## Aturan emas (biar jarang kena masalah)

- **Satu fitur = satu branch, selalu mulai dari `main` terbaru:**
  ```
  git checkout main
  git pull
  git checkout -b feature/nama-fiturmu
  ```
- **Jangan kerja langsung di `main`.** `main` hanya diubah lewat Pull Request.
- **Sebelum commit, cek dua hal:**
  ```
  git status -sb
  git grep -nE "^(<<<<<<<|=======|>>>>>>>)"
  ```
  Perintah kedua harus **kosong**. Kalau ada hasil, ada penanda konflik yang tertinggal.
- **Jangan `git commit -am` secara buta.** `-a` hanya memasukkan file yang sudah dilacak, dan ikut memasukkan file yang tidak sengaja berubah. Lihat dulu isi `git status`.
- **Jangan `git push --force`** dan jangan `reset --hard` di branch yang sudah di-push. Itu bisa menghapus kerjaan orang lain.
- **Saat PR di-merge, pilih "Squash and merge"** supaya riwayat `main` rapi.
- **Jangan format ulang file yang tidak kamu ubah.** Matikan "format on save" (Prettier) kalau filenya jadi penuh perubahan padahal kamu tidak mengubahnya.
- **Sebelum menimpa atau memperbaiki branch orang lain, kabari dia.**

---

## Perintah untuk memeriksa keadaan

- Branch apa yang sedang aktif:
  ```
  git branch --show-current
  ```
- Status ringkas (ada apa yang berubah, sudah di depan atau belakang remote):
  ```
  git status -sb
  ```
- Lima commit terakhir:
  ```
  git log --oneline -5
  ```
- Beda isi branch-mu dengan `main` (nama file saja):
  ```
  git fetch origin
  git diff --stat origin/main
  ```

---

## 1. Penanda konflik tertinggal di file

**Gejala**
- Tab **Problems** merah, pesan "Merge conflict marker encountered".
- Di file ada baris `<<<<<<< HEAD`, `=======`, `>>>>>>> nama-branch`.
- Halaman web mati atau tombol tidak bereaksi, karena di JavaScript dan CSS penanda itu **error sintaks**.

**Penyebab**
- Konflik muncul waktu merge, lalu file di-commit sebelum penandanya dibersihkan.

**Cara membaca konfliknya**
- **Current Change / HEAD** = versi di branch yang sedang kamu pakai.
- **Incoming Change** = versi yang sedang digabungkan masuk.
- Kamu tidak harus memilih salah satu secara buta. Kadang yang benar adalah gabungan dua-duanya.

**Cara membereskan**
1. Cari semua file yang masih berpenanda:
   ```
   git grep -nE "^(<<<<<<<|=======|>>>>>>>)"
   ```
2. Buka file itu. Klik **Accept Current Change**, **Accept Incoming Change**, atau **Accept Both Changes** di atas blok konflik. Kalau dua barisnya hampir sama, hapus kelima baris konflik dan tulis satu baris yang benar.
3. Cek lagi sampai `git grep` kosong dan tab Problems bersih.
4. Simpan semua file (Ctrl+K lalu S), lalu `git add` dan `git commit`.

**Cara cepat kalau file itu seharusnya sama dengan `main`**
```
git fetch origin
git checkout origin/main -- pages/auth/otp.js
```
Ganti nama file sesuai yang bermasalah. Perintah ini mengambil file itu persis seperti di `main`.

---

## 2. "Already up to date" tapi penanda konflik masih ada

**Gejala**
- `git pull` atau `git merge origin/main` bilang *Already up to date*, tapi file masih penuh penanda.

**Penyebab**
- Git membandingkan **riwayat commit**, bukan isi file. Kalau penanda konflik sudah ter-commit, Git menganggapnya perubahan biasa yang sudah selesai.
- Merge hanya menyentuh file yang berubah di salah satu sisi sejak kedua branch berpisah.

**Solusi**
- Jangan merge ulang. Ambil file yang rusak dari versi yang bersih:
  ```
  git checkout origin/main -- path/ke/file.js
  git grep -nE "^(<<<<<<<|=======|>>>>>>>)"
  git commit -am "Pakai file versi main yang bersih"
  ```
- Sebelum itu pastikan `main` sendiri bersih:
  ```
  git grep -nE "^(<<<<<<<|=======|>>>>>>>)" origin/main
  ```
  Kalau `main` yang kotor, perbaiki di `main` lewat PR lebih dulu.

---

## 3. Terminal terjebak di editor aneh (Vim)

**Gejala**
- Setelah `git merge` atau `git commit` tanpa `-m`, terminal berubah jadi layar dengan tulisan `.git/MERGE_MSG` atau `COMMIT_EDITMSG` di bawah, dan tombol biasa tidak jalan.

**Penyebab**
- Git membuka editor **Vim** untuk meminta pesan commit. Ini bukan error.

**Solusi**
- Tekan **Esc**, ketik `:wq`, lalu **Enter**. Pesan bawaan tersimpan dan merge selesai.

**Supaya tidak terulang**
- Pakai VS Code sebagai editor pesan:
  ```
  git config --global core.editor "code --wait"
  ```
- Atau tulis pesannya langsung: `git commit -m "pesan"`, dan `git merge --no-edit origin/main`.

---

## 4. Branch ketinggalan dari `main` (konflik besar waktu PR)

**Gejala**
- PR menampilkan "This branch has conflicts".
- Perubahan terbaru dari `main` (halaman baru, perbaikan teman) tidak ada di branch-mu.

**Penyebab**
- Branch dibuat dari `main` yang lama dan tidak pernah diperbarui.

**Solusi**
- Perbarui branch-mu:
  ```
  git fetch origin
  git merge origin/main
  ```
- Kalau muncul konflik, **pertahankan kode `main`** lalu tambahkan fitur kamu di atasnya. Jangan hapus fungsi milik orang lain. Setelah selesai, `git grep` harus kosong.
- Untuk fitur berikutnya, mulai dari `main` terbaru (lihat Aturan emas) supaya tidak terulang.

---

## 5. Push ke `main` ditolak

**Gejala**
```
remote: error: GH006 ... Changes must be made through a pull request
```
atau tulisan *"Bypassed rule violations"* lalu diterima (khusus pemilik repo).

**Penyebab**
- `main` dilindungi: hanya boleh berubah lewat Pull Request. Pemilik repo boleh melewati aturan itu untuk perbaikan darurat, anggota lain tidak.

**Solusi**
- Buat branch dan buka PR:
  ```
  git checkout -b feature/nama-fiturmu
  git push -u origin feature/nama-fiturmu
  ```
  Lalu buka GitHub, klik **Compare & pull request**.

---

## 6. Sudah terlanjur commit di `main` / di branch yang salah

**Kalau BELUM commit** (perubahan masih belum di-commit):
```
git checkout -b feature/nama-fiturmu
```
Perubahanmu ikut terbawa ke branch baru. Lanjut commit di sana.

**Kalau SUDAH commit tapi BELUM push** dan tidak ada perubahan lain yang belum di-commit:
```
git branch feature/nama-fiturmu
git reset --hard origin/main
git checkout feature/nama-fiturmu
```
Commit-mu aman di branch baru, dan `main` lokal kembali bersih. **Jangan lakukan ini kalau sudah push.** Kalau ragu, tanya leader dulu.

---

## 7. `git pull` ditolak karena ada perubahan yang belum di-commit

**Gejala**
- Pesan *"Your local changes to the following files would be overwritten"*.

**Solusi: amankan dulu dengan stash**
```
git stash
git pull
git stash pop
```
- `git stash` menyimpan sementara perubahanmu, `git stash pop` mengembalikannya.
- File **baru** yang belum dilacak tidak ikut di-stash. Pakai `git stash -u` kalau perlu.
- Kalau `stash pop` menimbulkan konflik, selesaikan seperti masalah nomor 1.

---

## 8. `git pull` bilang "divergent branches"

**Gejala**
```
fatal: Need to specify how to reconcile divergent branches
```

**Penyebab**
- Branch-mu dan remote sama-sama punya commit baru yang berbeda.

**Solusi**
```
git pull --no-rebase
```
Atau atur sekali untuk selamanya:
```
git config --global pull.rebase false
```
Kalau muncul konflik, selesaikan seperti masalah nomor 1.

---

## 9. Branch orang lain (atau branch sendiri) berantakan

**Prinsip**
- **Jangan menimpa dengan force push** kalau branch itu sudah ada di GitHub.
- **Amankan dulu, perbaiki kemudian.**

**Langkah aman**
1. Buat cadangan (tidak mengubah apa pun):
   ```
   git branch backup/nama-branch
   ```
2. Lihat apa kerjaan asli di branch itu:
   ```
   git fetch origin
   git log --oneline origin/main..HEAD
   git diff --stat origin/main
   ```
3. Kalau kerjaan aslinya cuma beberapa file, buat **branch baru dari `main`** dan bawa file itu saja:
   ```
   git checkout -b feature/nama-fitur-v2 origin/main
   git checkout nama-branch-lama -- path/file1.css path/file2.html
   git commit -am "Bawa perbaikan dari branch lama"
   ```
4. Pakai nama branch baru. Kabari orang yang memakai branch lama.

**Kalau kamu memperbaiki branch teman**
- Kabari dia lebih dulu, lalu minta dia: `git checkout nama-branch` dan `git pull` sebelum lanjut coding.
- Kalau dia punya perubahan belum di-commit, suruh `git stash` dulu.
- Kalau dia punya commit lokal yang belum di-push, suruh kabari kamu dulu sebelum pull.

---

## 10. File yang tidak seharusnya ikut ter-commit

**Contoh yang pernah terjadi**
- `.vscode/settings.json` (isi port pribadi Live Server) ikut masuk PR.
- File yang sama sekali tidak diubah isinya, tapi muncul di diff karena **format ulang otomatis** (Prettier).

**Solusi**
- Keluarkan file dari commit tanpa menghapus filenya di laptopmu:
  ```
  git rm --cached .vscode/settings.json
  ```
  Lalu tambahkan `.vscode/` ke `.gitignore`.
- Kembalikan file yang hanya berubah karena format:
  ```
  git checkout origin/main -- index.html
  ```
- Matikan "format on save" di VS Code untuk file yang bukan milikmu.

---

## 11. Kontributor tidak muncul di daftar GitHub

**Gejala**
- Commit seseorang ada, tapi namanya tidak masuk daftar Contributors.

**Penyebab yang paling sering**
- **Email di commit tidak terhubung ke akun GitHub-nya.** Ini yang paling umum.
- PR-nya belum benar-benar masuk `main`.
- Daftar kontributor belum diperbarui (bisa tertunda beberapa jam).

**Cara memeriksa**
```
git shortlog -sne main
git log main --format="%h | %an <%ae> | %s" -20
```
Lihat nama dan email penulis tiap commit.

**Cara memperbaiki (dilakukan oleh orang yang commit-nya tidak terhitung)**
1. Di GitHub: **Settings, Emails**, tambahkan email yang muncul di `shortlog`, lalu verifikasi. Commit lama ikut terhitung otomatis.
2. Di laptopnya, supaya commit berikutnya benar:
   ```
   git config --global user.name "Nama Kamu"
   git config --global user.email "email-github-kamu@contoh.com"
   ```

**Mencatat orang lain sebagai ko-penulis** (misalnya kamu memperbaiki kode teman):
```
git commit -m "Pesan commit" -m "Co-authored-by: Nama Teman <email-github-teman@contoh.com>"
```
**Jangan** mengubah penulis commit lewat rebase atau force push. Itu merusak riwayat repo untuk semua anggota.

---

## 12. Perubahan yang belum di-commit ingin dibuang

- Satu file kembali ke versi terakhir yang di-commit:
  ```
  git restore path/ke/file.js
  ```
- Hati-hati: **perubahan di file itu hilang permanen.** Kalau ragu, `git stash` dulu.

---

## Kapan harus tanya leader

- Kamu sudah `git push --force` atau berniat melakukannya.
- Branch sudah di-push dan kamu mau `reset --hard`.
- Hasil `git status` menampilkan puluhan file yang kamu tidak tahu kenapa berubah.
- `main` sendiri berisi penanda konflik atau error.
- Kamu tidak yakin apakah perbaikannya akan menimpa kerjaan orang lain.

Saat bertanya, sertakan **screenshot terminal** dengan hasil dari `git status -sb`, `git branch --show-current`, dan `git log --oneline -5`.

---

## Contekan cepat

- Mulai fitur baru: `git checkout main`, `git pull`, `git checkout -b feature/x`
- Cek sebelum commit: `git status -sb` lalu `git grep -nE "^(<<<<<<<|=======|>>>>>>>)"`
- Perbarui branch dari main: `git fetch origin`, `git merge origin/main`
- Ambil satu file dari main: `git checkout origin/main -- path/file`
- Amankan perubahan sementara: `git stash`, lalu `git stash pop`
- Keluar dari Vim: `Esc`, `:wq`, `Enter`
- Cek penulis commit: `git shortlog -sne main`
