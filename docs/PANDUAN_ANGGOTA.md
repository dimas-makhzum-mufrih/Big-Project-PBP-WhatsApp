# 📗 Panduan Anggota — Proyek Akhir PBP (WhatsApp) — V4

Baca ini dulu sebelum mulai. Kalau ada yang nggak paham, tanya leader.

Proyek ini **fokus di web**. Nanti hasilnya di-convert ke mobile/desktop.

> **Versi 4:** ditambah bagian **Batalkan dan Kembalikan** (restore, stash, reset, revert, reflog) untuk memperbaiki kesalahan dengan aman.
> Yang dipakai: **Git + VS Code + akun GitHub**. Tidak perlu GitHub Desktop.

---

## Konsep Singkat

Bayangkan **GitHub = Google Drive kelas**, dan **laptopmu = meja kerjamu sendiri**.

- **Git**: Program di laptop untuk mencatat & mengatur perubahan kode
- **GitHub**: Website tempat repo disimpan online
- **Repo**: Folder proyek bersama
- **Branch**: "Jalur kerja" pribadimu, jadi kerjaanmu nggak bentrok dengan orang lain
- **Commit**: Simpan perubahan + catatan (masih di laptopmu)
- **Push**: **Upload** kerjaanmu dari laptop ke GitHub
- **Pull**: **Download** perubahan terbaru dari GitHub ke laptop
- **Pull Request (PR)**: Pesan ke leader: "Kerjaanku sudah jadi, tolong dicek dan dimasukkan ke versi utama (`main`)"
- **Merge**: Penggabungan. Yang memasukkan PR ke `main` hanya leader

---

## ⚠️ Jangan Tertukar: Istilah yang Mirip

**`git pull` dan Pull Request itu beda.**

- `git pull` adalah **command** yang kamu ketik. Artinya download update dari GitHub.
- **Pull Request (PR) bukan command.** Ini **tombol di website github.com** (**Compare & pull request**). Tidak ada kode yang diketik untuk membuat PR.

**`git merge main` dan "merge ke `main`" itu beda arah.**

- `git merge main` (kamu ketik di **branch sendiri**) artinya: **ambil isi `main` dan masukkan ke branch-mu**. Arahnya `main` → branch kamu. Ini **aman** dan memang dianjurkan.
- "Merge **ke** `main`" artinya memasukkan kerjaan ke versi utama. Arahnya branch kamu → `main`. Ini **hanya boleh leader**, lewat tombol **Merge** di PR.

Jadi aturan "DILARANG merge ke `main`" **tidak melarang** `git merge main` di branch sendiri.

**Tombol hijau "Merge pull request" di halaman PR bukan bagianmu.** Setelah **Create pull request**, berhenti dan tunggu leader.

---

## 🧭 Gambaran Besar (Contoh: Budi Mengerjakan Halaman Login)

1. Budi bikin branch `budi-login` (jalur kerjanya sendiri)
2. Budi ngoding lalu `commit` (simpan di laptop)
3. Budi `push` (upload ke GitHub, masih di jalur `budi-login`)
4. Budi klik **Pull Request** di github.com (pesan ke leader: "tolong dicek")
5. Leader mengecek kodenya. Kalau aman, leader klik **Merge**. Login Budi sekarang ada di `main`
6. Kalau belum aman, leader minta perbaikan. Budi memperbaiki di branch yang sama, `commit` dan `push` lagi, lalu PR otomatis ter-update dan dicek ulang
7. Semua orang (termasuk Budi dan Sari) `pull` untuk download `main` terbaru

Intinya: **push** = upload, **PR** = minta dicek, **merge** = leader memasukkan, **pull** = download hasilnya.

---

## 💾 Di Mana Kerjaanmu Tersimpan?

Kerjaanmu melewati empat tempat, makin ke bawah makin aman:

1. **Simpan file (`Ctrl+S`)**
   - Tersimpan di laptopmu, di folder proyek
   - Git belum tahu apa-apa. Kalau file ini salah ditimpa atau di-`restore`, perubahannya hilang
2. **`git add .`**
   - Perubahan ditandai sebagai "siap disimpan ke riwayat"
   - Masih di laptop
3. **`git commit`**
   - Perubahan dicatat sebagai satu titik di **riwayat Git di laptop**
   - Sudah bisa dikembalikan kapan saja, tapi kalau laptop rusak atau hilang, ikut hilang
4. **`git push`**
   - Salinannya naik ke **GitHub**
   - Ini yang paling aman. Laptop rusak pun kerjaanmu tetap ada

**Kalau belum sempat commit, apakah masih tersimpan?**

- **Iya**, selama file sudah di-`Ctrl+S`, isinya masih ada di laptopmu dan belum hilang
- Tapi itu **belum dicatat Git**, jadi gampang hilang kalau salah menjalankan `git restore`, atau laptop bermasalah
- Perubahan yang belum di-commit juga bisa menghalangi kamu pindah branch atau `git merge main`

**Kebiasaan yang aman:**

- `Ctrl+S` setiap selesai mengetik sesuatu
- `commit` setiap selesai satu bagian kecil
- `push` minimal sekali sehari dan **sebelum kamu berhenti kerja**

---

## 📖 Arti Bagian-Bagian Command

Setiap command tersusun dari beberapa bagian. Kalau paham bagian-bagiannya, kamu nggak perlu menghafal.

- **`git`**: memanggil program Git. Semua command Git diawali kata ini
- **`origin`**: nama panggilan untuk **alamat repo di GitHub**. Dibuat otomatis waktu `git clone`
- **`main`**: nama **branch** (jalur) utama
- **`origin main`** dibaca: "di GitHub, di jalur `main`". Jadi `origin` itu **tempat**, `main` itu **jalur** di tempat itu
- **`.` (titik)**: artinya "semua file yang berubah di folder ini". `git add .` = tandai semuanya. Kalau mau satu file saja: `git add nama-file`
- **`-b`**: "bikin baru". `checkout -b` = pindah **sambil membuat** branch baru
- **`-m`**: "message" (pesan). Pesan commit ditulis di dalam tanda kutip setelahnya
- **`-u`**: "upstream". Menghubungkan branch di laptop dengan branch di GitHub, cukup sekali. Setelahnya `git push` polos sudah cukup
- **`--abort`**: "batalkan". Dipakai untuk membatalkan merge yang kacau

---

## 📋 Kamus Command

Cukup hafal ini saja. Tiap command dijelaskan fungsi dan kapan dipakai.

**Persiapan (sekali saja)**

- `git --version`: cek Git sudah terpasang atau belum. Kalau muncul nomor versi, berarti sudah
- `git config --global user.name "Nama"`: beri tahu Git namamu. `--global` artinya berlaku untuk semua proyek di laptop ini
- `git config --global user.email "email"`: beri tahu Git emailmu (samakan dengan email GitHub)
- `git clone <link-repo>`: download seluruh repo dari GitHub ke laptop, lengkap dengan riwayatnya. `<link-repo>` diganti alamat repo

**Pindah dan lihat posisi**

- `git branch`: tampilkan daftar branch di laptop. Tanda `*` ada di branch yang sedang aktif
- `git branch -a`: tampilkan semua branch, termasuk yang ada di GitHub
- `git checkout nama-branch`: pindah ke branch itu
- `git checkout -b nama-fitur`: bikin branch baru dan langsung pindah ke sana. Branch baru adalah **salinan dari branch yang sedang aktif**
- `git status`: tampilkan file apa saja yang berubah dan belum disimpan
- `git diff`: tampilkan isi perubahan baris demi baris
- `git log --oneline`: tampilkan riwayat commit, satu baris per commit

**Mengambil update (GitHub → laptop)**

- `git pull origin main`: download update terbaru dari `main` di GitHub, lalu masukkan ke branch yang sedang aktif. Dipakai saat berada di `main`
- `git fetch`: ambil **info** terbaru dari GitHub (branch dan commit baru) tanpa mengubah file-mu. Aman dijalankan kapan saja
- `git merge main`: salin isi `main` (di laptop) ke branch yang sedang aktif. Bukan merge ke `main`
- `git merge --abort`: batalkan merge yang konflik atau kacau, kembali ke kondisi sebelumnya

**Menyimpan dan mengirim (laptop → GitHub)**

- `git add .`: tandai semua perubahan supaya ikut disimpan di commit berikutnya
- `git commit -m "pesan"`: simpan perubahan yang sudah ditandai ke riwayat Git di laptop, dengan catatan singkat
- `git push -u origin nama-branch`: upload branch ke GitHub **untuk pertama kali** dan hubungkan dengan branch di laptop
- `git push`: upload commit berikutnya (setelah push pertama)

**Membatalkan dan menyimpan sementara** (penjelasan lengkap dan contoh situasi ada di bagian "Batalkan dan Kembalikan")

- `git restore nama-file`: **buang** perubahan satu file yang belum di-commit, kembali ke versi terakhir
- `git checkout .`: **buang** perubahan semua file yang belum di-`add` (sama dengan `git restore .`)
- `git restore --staged nama-file`: batalkan `git add`. File tetap berubah, hanya tidak jadi ikut commit
- `git stash`: simpan perubahan yang belum di-commit ke "laci sementara" supaya folder bersih
- `git stash list`: lihat isi "laci sementara"
- `git stash pop`: ambil kembali perubahan dari "laci sementara"
- `git commit --amend -m "pesan baru"`: ganti pesan commit **terakhir** yang belum di-push
- `git reset --soft HEAD~1`: batalkan commit terakhir, **perubahan di kode tetap ada**. Hanya untuk commit yang belum di-push
- `git reset --hard`: **buang semua** perubahan yang belum di-commit, termasuk yang sudah di-`add`. Hilang permanen
- `git revert kode-commit`: bikin commit baru yang membatalkan commit lama. Aman untuk commit yang sudah di-push
- `git reflog`: catatan semua posisi yang pernah kamu lewati, berguna untuk mencari commit yang "hilang"

---

## 🛟 Batalkan dan Kembalikan

Kesalahan di Git hampir selalu bisa diperbaiki, asal tahu command yang tepat. Pilih berdasarkan **situasimu**, bukan hafalan.

**Tingkat risiko:**

- ✅ **Aman**: tidak ada yang hilang
- ⚠️ **Hati-hati**: perubahan bisa hilang
- ⛔ **Bahaya**: hilang permanen, tanya leader dulu kalau ragu

### Situasi 1: Salah edit, belum commit

- **Satu file** ⚠️
  ```bash
  git restore nama-file        # kembalikan file itu ke versi terakhir
  ```
- **Semua file** ⚠️
  ```bash
  git checkout .               # kembalikan semua file yang belum di-add
  ```
- File baru yang belum pernah di-`add` tidak ikut terhapus oleh dua command di atas
- `git checkout .` hanya membuang perubahan yang **belum di-`add`**. Kalau sudah di-`add`, lanjut ke situasi 2

### Situasi 2: Sudah `git add`, tapi belum mau commit

```bash
git restore --staged nama-file   # ✅ batalkan penandaan, isi file tetap
```

### Situasi 3: Sudah commit, belum push, mau dibatalkan

```bash
git reset --soft HEAD~1      # ⚠️ batalkan commit terakhir, perubahan tetap ada di kode
```

- `HEAD~1` artinya "satu commit sebelum posisi sekarang". Mau mundur dua commit: `HEAD~2`
- Setelah itu perbaiki kodenya, lalu `git add .` dan `git commit` lagi
- **Hanya untuk commit yang belum di-push.** Kalau sudah di-push, lihat situasi 4
- Kalau yang salah cuma pesan commit: `git commit --amend -m "pesan baru"`

### Situasi 4: Sudah di-push, mau dibatalkan

Jangan pakai `reset`, karena setelahnya push harus dipaksa (`--force`), dan itu **DILARANG**. Pakai `revert`:

```bash
git log --oneline            # cari kode commit yang mau dibatalkan (7 huruf di depan)
git revert kode-commit       # ✅ bikin commit baru yang membatalkannya
git push
```

Kalau terbuka editor pesan, simpan lalu tutup saja.

### Situasi 5: Merge atau konflik jadi kacau

```bash
git merge --abort            # ✅ kembali ke kondisi sebelum merge
```

### Situasi 6: Mau pindah branch, tapi kerjaan belum selesai

```bash
git stash                    # ✅ simpan sementara, folder jadi bersih
git checkout branch-lain     # pindah dan urus yang lain
git checkout branch-awal     # balik lagi
git stash pop                # ✅ ambil kembali kerjaanmu
```

- `git stash list`: lihat apa saja yang tersimpan
- `git stash -u`: ikut menyimpan file baru yang belum di-`add`

### Situasi 7: Mau buang SEMUA perubahan, mulai bersih

```bash
git reset --hard             # ⛔ kembali ke commit terakhir, semua perubahan hilang
```

- Bedanya dengan `git checkout .`: `reset --hard` membuang **semuanya**, termasuk yang sudah di-`add`
- Jangan tambah target lain seperti `origin/main` atau `HEAD~1` tanpa izin leader. Itu bisa membuang commit

### Situasi 8: Merasa ada kerjaan yang hilang

```bash
git reflog                   # ✅ lihat catatan semua posisi yang pernah kamu lewati
```

Commit yang "hilang" setelah reset biasanya masih tercatat di sini. Tanya leader sebelum memulihkannya.

### Aturan sebelum memakai command ⚠️ atau ⛔

1. `git status` dulu, lihat apa yang akan terdampak
2. Ragu? Salin folder proyek ke tempat lain sebagai cadangan
3. `--hard` dan `HEAD~` hanya untuk perubahan di laptopmu yang **belum di-push**
4. Tidak yakin? Tanya leader, jangan dicoba-coba

---

## 1. Persiapan (sekali saja)

### A. Install Git

1. Buka https://git-scm.com → **Download for Windows**
2. Install, pilihan lain klik **Next** saja sampai selesai
3. Restart VS Code
4. Cek di terminal VS Code: `git --version`. Kalau muncul versinya, berarti sudah terpasang.

### B. Atur identitas Git (wajib, untuk semua cara)

Git perlu tahu siapa yang commit. Jalankan di terminal VS Code (`` Ctrl+` ``), **walaupun nanti kamu pakai cara VS Code**:

```bash
git config --global user.name "Nama Kamu"          # namamu, dicatat di setiap commit
git config --global user.email "emailgithubmu@gmail.com"   # email, samakan dengan akun GitHub
```

> Kalau lupa, commit pertamamu akan error: **"Please tell me who you are"**.

### C. Terima undangan collaborator

Cek email / notifikasi GitHub, lalu klik **Accept invitation**.
Kalau belum diterima, push kamu akan ditolak.

### D. Clone repo

**Cara VS Code (tanpa terminal):**

1. Buka VS Code, tekan `Ctrl+Shift+P`
2. Ketik **Git: Clone**, pilih **Clone from GitHub**
3. Login akun GitHub (terbuka di browser), lalu pilih repo proyek
4. Pilih folder penyimpanan, lalu klik **Open**

**Cara Terminal:**

```bash
git clone https://github.com/USERNAME/NAMA-REPO.git   # download repo dari GitHub ke laptop
cd NAMA-REPO                                           # masuk ke folder repo
```

### E. Bikin branch sendiri

Format nama: `nama-fitur`, contoh `dani-chat`, `kevin-login`. Tanpa spasi.

**Cara Terminal:**

```bash
git checkout -b nama-fitur     # bikin branch baru dan langsung pindah ke sana
```

**Cara VS Code:**

1. Klik nama branch di **pojok kiri bawah** (tulisannya `main`)
2. Pilih **Create new branch...**
3. Ketik nama branch, tekan Enter

> Branch baru adalah **salinan dari branch yang sedang aktif**. Karena itu, pastikan kamu ada di `main` yang sudah terbaru (`git pull origin main`) **sebelum** bikin branch.

---

## 2. Alur Kerja Sehari-hari

### Langkah 1 — Ambil update terbaru dari `main` (selalu pertama, sebelum mulai kerja)

Tujuannya: supaya branch-mu nggak ketinggalan hasil kerja teman yang sudah masuk `main`.

**Cara Terminal:**

```bash
git checkout main            # 1. pindah ke branch main di laptop
git pull origin main         # 2. DOWNLOAD update main dari GitHub ke laptop
git checkout nama-fitur      # 3. balik ke branch kamu
git merge main               # 4. MASUKKAN update main ke branch kamu
```

**Penjelasan tiap baris:**

- Baris 1: pindah ke `main` supaya bisa diperbarui
- Baris 2: `pull` = download. `origin main` = dari GitHub, jalur `main`. Sekarang `main` di laptopmu sudah terbaru
- Baris 3: kembali ke branch kerjamu
- Baris 4: salin `main` yang baru ke branch kamu. Arahnya `main` → branch kamu, jadi **bukan** merge ke `main`, dan aman
- Kalau kamu baru saja bikin branch dari `main` yang sudah terbaru, kamu sudah up to date dan baris 3-4 boleh dilewati

> ⚠️ Kalau ada perubahan yang belum di-commit, Git bisa menolak pindah branch / merge.
> Solusinya: **commit dulu**, atau `git stash` → lakukan langkah di atas → `git stash pop`.

**Cara VS Code:**

1. Pindah ke `main` (klik nama branch kiri bawah → pilih `main`)
2. Tab **Source Control** (`Ctrl+Shift+G`) → titik tiga `...` → **Pull**
3. Pindah balik ke branch kamu
4. Titik tiga `...` → **Branch** → **Merge Branch...** → pilih `main`

### Langkah 2 — Kerja

Ngoding di branch kamu. Fokus ke fitur yang dibagi leader.

> Sebelum mulai, pastikan kamu **bukan** di `main` (cek pojok kiri bawah / `git branch`).
> Sambil kerja, `Ctrl+S` setiap selesai mengetik, dan commit setiap selesai satu bagian kecil.

### Langkah 3 — Simpan & upload

**Cara Terminal:**

```bash
git status                           # cek file apa saja yang berubah (pastikan tidak ada file asing)
git add .                            # tandai semua perubahan untuk disimpan
git commit -m "tambah halaman login" # simpan ke riwayat Git di laptop, dengan catatan
git push -u origin nama-fitur        # UPLOAD ke GitHub (push PERTAMA untuk branch ini)
```

**Penjelasan tiap baris:**

- `git status`: lihat daftar file yang berubah. Biasakan sebelum `git add .`
- `git add .`: `add` = tandai, `.` = semua file. Belum disimpan ke riwayat
- `git commit -m "..."`: `commit` = simpan ke riwayat, `-m` = di dalam kutip adalah pesannya. Pesan harus jelas
- `git push -u origin nama-fitur`: `push` = upload, `origin` = ke GitHub, `nama-fitur` = branch yang dikirim, `-u` = hubungkan branch laptop dengan GitHub

Untuk commit berikutnya di branch yang sama, cukup:

```bash
git add .                     # tandai perubahan baru
git commit -m "pesan commit"  # simpan ke riwayat
git push                      # upload (tujuan sudah diingat Git karena -u tadi)
```

> `-u` cukup sekali. Kalau lupa dan muncul error **"has no upstream branch"**, jalankan `git push -u origin nama-fitur`.

**Cara VS Code:**

1. Tab **Source Control** → cek daftar file yang berubah → ketik pesan commit → klik **Commit**
2. Push pertama kali: klik **Publish Branch**. Berikutnya: **Sync Changes**

### Langkah 4 — Buat Pull Request (di website, bukan di terminal)

**PR tidak punya command.** Ini tombol di github.com:

1. Setelah `push`, buka repo di github.com
2. Klik tombol hijau **Compare & pull request**
3. Pastikan targetnya `main`, tulis judul + penjelasan singkat
4. Klik **Create pull request**
5. **Berhenti di sini.** Jangan klik tombol hijau **Merge pull request**. Itu bagian leader

**Setelah PR dibuat:**

- PR-mu otomatis terkunci (tidak bisa di-merge) sampai leader menyetujui
- Leader mengecek kodemu di **Files changed**
- **Kalau aman:** leader menyetujui dan merge. Kerjaanmu masuk `main`
- **Kalau perlu perbaikan:** leader menulis komentar. Perbaiki di **branch yang sama**, lalu `add`, `commit`, `push` lagi. PR otomatis ter-update, **tidak perlu bikin PR baru**

### Langkah 5 — Setelah PR di-merge leader

PR-mu sudah masuk ke `main`. Jangan lanjut kerja di branch lama. Mulai fitur berikutnya dengan bersih:

```bash
git checkout main                       # pindah ke main
git pull origin main                    # download main terbaru (sudah berisi kerjaanmu)
git checkout -b nama-fitur-berikutnya   # bikin branch baru untuk fitur berikutnya
```

> Satu PR selesai, satu branch selesai. Mau kerja lagi, bikin branch baru.
> Branch lama boleh dibiarkan, tidak perlu dihapus kecuali leader meminta.

---

## 3. Cek Posisi Kamu

- Lagi di branch mana
  - Terminal: `git branch`
  - VS Code: Pojok kiri bawah
- File yang berubah
  - Terminal: `git status`
  - VS Code: Tab Source Control
- Isi perubahan
  - Terminal: `git diff`
  - VS Code: Klik file di Source Control
- Riwayat commit
  - Terminal: `git log --oneline`
  - VS Code: Ekstensi Git Graph (opsional)
- Semua branch (termasuk teman)
  - Terminal: `git fetch` lalu `git branch -a`
  - VS Code: Klik nama branch kiri bawah

---

## 4. Melanjutkan Kerjaan Teman

Kalau diminta / diizinkan melanjutkan branch teman (misal `budi-chat`):

**Cara Terminal:**

```bash
git fetch                                  # ambil info branch terbaru dari GitHub
git checkout budi-chat                     # pindah ke branch teman
git checkout -b namamu-lanjut-budi-chat    # bikin branch baru milikmu dari situ
```

**Cara VS Code:** klik branch kiri bawah → pilih `origin/budi-chat` → lalu bikin branch baru dari situ.

Kerjakan di branch barumu, lalu PR seperti biasa.
**Jangan push langsung ke branch teman** tanpa izin.

---

## 5. Kalau Ada Masalah

- **Salah edit file, belum commit:** `git restore nama-file` (perubahan file itu hilang, kembali ke versi terakhir)
- **Salah commit, belum push:** `git reset --soft HEAD~1` (perubahan di kode tetap ada)
- **Salah commit, sudah push:** `git revert kode-commit`, lalu `git push`. Jangan force push
- **Mau membatalkan `git add`:** `git restore --staged nama-file`
- **Semua terasa kacau:** buka bagian "Batalkan dan Kembalikan". Jangan asal `git reset --hard`
- **Mau pindah branch tapi ada perubahan belum disimpan:** `git stash` → pindah branch → `git stash pop`
- **Belum sempat commit tapi laptop mau dimatikan:** file yang sudah di-`Ctrl+S` tetap ada di laptop. Lebih aman commit dan push dulu
- **Salah ketik pesan commit terakhir (belum push):** `git commit --amend -m "pesan baru"`
- **Lupa di branch mana:** `git branch`
- **Push ditolak:** Cek sudah menerima undangan collaborator, dan kamu tidak sedang di `main`
- **Error "has no upstream branch":** Jalankan `git push -u origin nama-branch`
- **Error "Please tell me who you are":** Jalankan dua perintah `git config` di Persiapan bagian B
- **Terlanjur ngoding di `main` (belum commit):** Jangan panik. Jalankan `git checkout -b nama-fitur`. Perubahanmu ikut pindah ke branch baru, lalu commit seperti biasa. `main` tetap bersih.
- **Terlanjur commit di `main` (belum push):** Beri tahu leader sebelum melakukan apa pun. Jangan push.

### Muncul CONFLICT

Konflik artinya dua orang mengubah baris yang sama. Itu hal biasa, bukan kesalahan fatal.

**Cara VS Code (paling mudah):**

1. Buka file yang bertanda konflik di Source Control (bagian **Merge Changes**)
2. Di atas bagian yang konflik ada pilihan:
   - **Accept Current Change**: pakai versi kamu
   - **Accept Incoming Change**: pakai versi dari `main`
   - **Accept Both Changes**: pakai dua-duanya
3. Pilih yang benar (kalau ragu, tanya leader), pastikan tanda `<<<<<<<`, `=======`, `>>>>>>>` sudah hilang
4. Simpan file, lalu `git add .` → `git commit`

**Kalau terasa makin kacau**, batalkan semuanya dan ulangi dari awal:

```bash
git merge --abort    # batalkan merge, kembali ke kondisi sebelum merge
```

Ini mengembalikan branch-mu ke kondisi sebelum merge. Tidak ada kerjaanmu yang hilang.

---

## 6. File Penting di Repo

**`README.md`** adalah halaman depan repo: deskripsi proyek, anggota, cara menjalankan, dan **daftar fungsi tiap folder**. Baca ini pertama kali setelah clone supaya tahu mau taruh kode di mana. **Hanya leader yang edit.**

**`.gitignore`** adalah daftar file yang **tidak ikut di-upload** ke GitHub, misalnya `node_modules/`, `.env` (password/token), dan isi folder `uploads/`. Biar repo nggak berat dan data rahasia nggak bocor. **Hanya leader yang edit.**

**`.gitkeep`** adalah file kosong di dalam folder kosong (misal `uploads/`) supaya foldernya ikut ke GitHub. Jangan dihapus.

> Kalau ada file yang harusnya masuk tapi nggak muncul di Source Control, kemungkinan kena `.gitignore`. Tanya leader.

---

## 7. Rules Wajib ⚠️

1. ❌ **DILARANG merge ke `main`.** Hanya leader. (Ini tidak melarang `git merge main` di branch sendiri, lihat bagian "Jangan Tertukar")
2. ❌ **DILARANG klik tombol "Merge pull request"** di PR. Setelah Create pull request, tunggu leader.
3. ❌ **DILARANG kerja langsung di `main`.** Selalu di branch sendiri.
4. ❌ **DILARANG `git push --force` (atau `-f`).** Ini bisa menimpa dan menghapus kerjaan orang lain.
5. ⛔ **Jangan pakai `git reset --hard` atau `git checkout .` kalau belum yakin.** Perubahan yang belum di-commit hilang permanen. Lihat bagian "Batalkan dan Kembalikan".
6. 💡 **Punya ide / mau tambah fitur / mau ubah struktur → TANYA LEADER DULU**, jangan langsung dikerjakan.
7. 📁 **Kerjakan hanya bagian/fitur yang dibagi ke kamu.** Mau edit file orang lain atau file umum (`README.md`, `.gitignore`, `.github/CODEOWNERS`) → izin dulu.
8. ⬇️ **Selalu ambil update dari `main` sebelum mulai kerja** (Langkah 1).
9. 📝 **Pesan commit harus jelas.** Bagus: `tambah halaman login`. Jelek: `update`, `fix`, `asdf`.
10. 🔁 **Fitur selesai → langsung PR.** Jangan menumpuk berhari-hari.
11. 🔒 **Jangan commit data rahasia** (password, token, file `.env`). Cek `git status` sebelum `git add .`.
12. 💾 **Commit dan push sebelum berhenti kerja**, supaya kerjaanmu aman di GitHub.
13. 🤝 **Boleh melanjutkan kerjaan teman**, tapi lewat branch baru dan dengan izin.
14. 🙋 **Ragu / error / bingung → tanya**, jangan dipaksa.
