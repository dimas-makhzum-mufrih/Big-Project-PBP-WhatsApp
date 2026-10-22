# 📗 Panduan Anggota — Proyek Akhir PBP (WhatsApp)

Baca ini dulu sebelum mulai. Kalau ada yang nggak paham, tanya leader.

Proyek ini **fokus di web**. Nanti hasilnya di-convert ke mobile/desktop.
Yang dipakai: **Git + VS Code + akun GitHub**. Tidak perlu GitHub Desktop.

---

## Konsep Singkat

- **Git**: Program di laptop untuk mencatat & mengatur perubahan kode
- **GitHub**: Website tempat repo disimpan online
- **Repo**: Folder proyek bersama
- **Branch**: "Jalur kerja" pribadimu, jadi kerjaanmu nggak bentrok dengan orang lain
- **Commit**: Simpan perubahan + catatan
- **Push**: Kirim commit ke GitHub
- **Pull**: Ambil perubahan terbaru dari GitHub ke laptop
- **Pull Request (PR)**: Minta leader menggabungkan kerjaanmu ke `main`
- **Merge**: Penggabungan. Merge **ke `main`** hanya boleh leader

---

## 📋 Command yang Dipakai di Proyek Ini

Cukup hafal ini saja:

- `git --version`: Cek Git sudah terpasang
- `git config --global user.name "Nama"` / `user.email "email"`: Atur identitas (sekali saja)
- `git clone <link-repo>`: Download repo ke laptop (sekali saja)
- `git checkout -b nama-fitur`: Bikin branch baru + langsung pindah ke sana
- `git checkout nama-branch`: Pindah ke branch lain
- `git branch`: Lihat branch yang sedang dipakai (tanda `*`)
- `git status`: Lihat file apa yang berubah
- `git pull origin main`: Ambil update terbaru dari `main` di GitHub
- `git merge main`: Masukkan update `main` ke branch kamu
- `git merge --abort`: Batalkan merge yang lagi kacau / konflik
- `git add .`: Tandai semua perubahan untuk disimpan
- `git commit -m "pesan"`: Simpan perubahan dengan catatan
- `git push -u origin nama-branch`: Kirim branch ke GitHub **(push pertama)**
- `git push`: Kirim commit berikutnya (setelah push pertama)
- `git fetch`: Ambil info branch terbaru (termasuk punya teman)
- `git diff`: Lihat isi perubahan
- `git log --oneline`: Lihat riwayat commit
- `git restore nama-file`: Batalkan perubahan file (belum commit)
- `git stash` / `git stash pop`: Simpan sementara / kembalikan

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
git config --global user.name "Nama Kamu"
git config --global user.email "emailgithubmu@gmail.com"
```

> Kalau lupa, commit pertamamu akan error: **"Please tell me who you are"**.
> Pakai email yang sama dengan akun GitHub-mu.

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
git clone https://github.com/USERNAME/NAMA-REPO.git
cd NAMA-REPO
```

### E. Bikin branch sendiri

Format nama: `nama-fitur`, contoh `dani-chat`, `kevin-login`. Tanpa spasi.

**Cara Terminal:**

```bash
git checkout -b nama-fitur
```

**Cara VS Code:**

1. Klik nama branch di **pojok kiri bawah** (tulisannya `main`)
2. Pilih **Create new branch...**
3. Ketik nama branch, tekan Enter

---

## 2. Alur Kerja Sehari-hari

### Langkah 1 — Ambil update terbaru dari `main` (sebelum mulai kerja)

**Cara Terminal:**

```bash
git checkout main            # pindah ke main
git pull origin main         # ambil update terbaru dari GitHub
git checkout nama-fitur      # balik ke branch kamu
git merge main               # masukkan update main ke branch kamu
```

> **`git pull origin main`** = "ambil perubahan terbaru dari `main` di GitHub (`origin`), masukkan ke laptopku".
> **`git merge main`** di sini beda dengan merge-nya leader. Arahnya dari `main` **ke branch kamu**, bukan ke `main`. Aman dilakukan siapa saja.

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

### Langkah 3 — Simpan & kirim

**Cara Terminal:**

```bash
git status                           # cek dulu file apa saja yang berubah
git add .
git commit -m "tambah halaman login"
git push -u origin nama-fitur        # push PERTAMA kali untuk branch ini
```

Untuk commit berikutnya di branch yang sama, cukup:

```bash
git add .
git commit -m "pesan commit"
git push
```

> `-u` memasangkan branch di laptopmu dengan branch di GitHub (cukup sekali).
> Kalau lupa `-u` dan muncul error **"has no upstream branch"**, jalankan `git push -u origin nama-fitur`.

> 🔍 **Biasakan `git status` sebelum `git add .`** supaya kelihatan kalau ada file yang tidak seharusnya ikut (misal `.env`, file besar, atau file acak).

**Cara VS Code:**

1. Tab **Source Control** → cek daftar file yang berubah → ketik pesan commit → klik **Commit**
2. Push pertama kali: klik **Publish Branch**. Berikutnya: **Sync Changes**

### Langkah 4 — Buat Pull Request

1. Buka repo di github.com
2. Klik **Compare & pull request**
3. Pastikan targetnya `main`, tulis judul + penjelasan singkat
4. Klik **Create pull request**, lalu tunggu leader review
5. Kalau diminta revisi: perbaiki, commit, push lagi (PR otomatis ikut ter-update)

### Langkah 5 — Setelah PR di-merge leader

PR-mu sudah masuk ke `main`. Jangan lanjut kerja di branch lama. Mulai fitur berikutnya dengan bersih:

```bash
git checkout main
git pull origin main
git checkout -b nama-fitur-berikutnya
```

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
git fetch
git checkout budi-chat
git checkout -b namamu-lanjut-budi-chat
```

**Cara VS Code:** klik branch kiri bawah → pilih `origin/budi-chat` → lalu bikin branch baru dari situ.

Kerjakan di branch barumu, lalu PR seperti biasa.
**Jangan push langsung ke branch teman** tanpa izin.

---

## 5. Kalau Ada Masalah

- **Salah edit file, belum commit:** `git restore nama-file`
- **Mau pindah branch tapi ada perubahan belum disimpan:** `git stash` → pindah branch → `git stash pop`
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
git merge --abort
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

1. ❌ **DILARANG merge ke `main`.** Hanya leader.
2. ❌ **DILARANG kerja langsung di `main`.** Selalu di branch sendiri.
3. ❌ **DILARANG `git push --force` (atau `-f`).** Ini bisa menimpa dan menghapus kerjaan orang lain.
4. 💡 **Punya ide / mau tambah fitur / mau ubah struktur → TANYA LEADER DULU**, jangan langsung dikerjakan.
5. 📁 **Kerjakan hanya bagian/fitur yang dibagi ke kamu.** Mau edit file orang lain atau file umum (`README.md`, `.gitignore`) → izin dulu.
6. ⬇️ **Selalu ambil update dari `main` sebelum mulai kerja** (Langkah 1).
7. 📝 **Pesan commit harus jelas.** Bagus: `tambah halaman login`. Jelek: `update`, `fix`, `asdf`.
8. 🔁 **Fitur selesai → langsung PR.** Jangan menumpuk berhari-hari.
9. 🔒 **Jangan commit data rahasia** (password, token, file `.env`). Cek `git status` sebelum `git add .`.
10. 🤝 **Boleh melanjutkan kerjaan teman**, tapi lewat branch baru dan dengan izin.
11. 🙋 **Ragu / error / bingung → tanya**, jangan dipaksa.
