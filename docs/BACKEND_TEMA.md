# Rancangan Backend: Tema & Ngumpul Plus (bagian untuk dikerjakan)

Dokumen ini pelengkap `RENCANA_BACKEND.md` (Node/Express, PostgreSQL, JWT, Socket.IO). Isinya hanya bagian tema dan langganan premium. Frontend sudah siap: semua pilihan tema ada di satu tempat (`assets/js/theme.js`), jadi backend cukup menyimpan dan mengembalikan satu objek JSON.

## 1. Yang sekarang disimpan di localStorage

| Key | Isi | Cakupan |
|---|---|---|
| `ngumpul_premium_<idAkun>` | `"1"` jika akun punya Ngumpul Plus | per akun |
| `ngumpul_tema_<idAkun>` | id tema terakhir (mis. `lotus`) | per akun |
| `ngumpul_sky_mode` | `siklus` / `siang` / `malam` (tema langit) | per perangkat |
| `ngumpul_aurora_gerak` | `jalan` / `pelan` / `diam` | per perangkat |
| `ngumpul_golden_mode` | `otomatis` / `terang` / `gelap` (Golden Hour) | per perangkat |
| `ngumpul_hiasan` | `penuh` / `ringan` / `polos` | per perangkat |
| `ngumpul_pref_objek` | `tampil` / `sembunyi` | per perangkat |
| `ngumpul_pref_efek` | `nyala` / `mati` | per perangkat |
| `ngumpul_pref_kecepatan` | `pelan` / `normal` / `cepat` | per perangkat |
| `ngumpul_pref_rapat` | `sedikit` / `normal` / `banyak` | per perangkat |
| `ngumpul_pref_hujan` | `mati` / `gerimis` / `deras` | per perangkat |

Catatan: panel di UI sudah berjudul "Disimpan per akun". Saat backend jadi, semua key di atas dipindah ke satu objek per akun (bagian 2), kecuali `ngumpul_hiasan` yang sebaiknya tetap boleh beda per perangkat (HP lemah vs laptop). Keputusan ini perlu disepakati (lihat bagian 7).

## 2. Data

Tabel `user_settings` sudah punya kolom `tema text`. Usulan: ganti jadi JSONB, tambah tabel langganan.

```sql
ALTER TABLE user_settings
  ALTER COLUMN tema TYPE jsonb USING jsonb_build_object('id', tema);
-- isi: {"id":"lotus","sky":"siklus","aurora":"pelan","golden":"otomatis",
--       "pref":{"hiasan":"penuh","objek":"tampil","efek":"nyala","kecepatan":"normal","rapat":"normal","hujan":"gerimis"}}

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'plus',
  status text NOT NULL CHECK (status IN ('aktif','habis','dibatalkan')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,            -- NULL = tanpa batas (mode tugas kuliah)
  source text NOT NULL DEFAULT 'manual', -- manual | langkah_tab | pembayaran
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions (user_id, status);
```

Daftar id tema yang sah tidak disimpan di DB. Taruh di satu file server `tema-daftar.js` (sama dengan kunci `TEMA` di `theme.js`) supaya validasi mudah. Tema dasar: `light`, `dark`. Sisanya premium.

## 3. Endpoint (awalan `/api/v1`, semua butuh JWT)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/me/tema` | Kembalikan objek tema + `premium: true/false` |
| PUT | `/me/tema` | Simpan objek tema (validasi di bawah) |
| GET | `/me/plus` | Status langganan: `{aktif, plan, expires_at}` |
| POST | `/me/plus/aktifkan` | Aktifkan Plus (versi tugas: dari alur "langkah tab" di frontend) |
| DELETE | `/me/plus` | Batalkan |

Aturan validasi `PUT /me/tema`:
1. `id` harus ada di `tema-daftar.js`. Jika tema premium dan akun tidak punya langganan aktif, jawab `403 {kode:"PREMIUM_DIPERLUKAN"}`.
2. Nilai `pref.*` harus salah satu dari daftar pada tabel bagian 1. Nilai tak dikenal ditolak `400`.
3. Boleh kirim sebagian (PATCH semantik): field yang tidak dikirim tidak berubah.
4. Jika langganan habis, jangan hapus pilihan. Kembalikan tema dasar saat `GET` (`tema_efektif`) dan simpan pilihan asli agar kembali saat aktif lagi.

Respons `GET /me/tema`:
```json
{ "id": "lotus", "tema_efektif": "lotus", "premium": true,
  "sky": "siklus", "aurora": "pelan", "golden": "otomatis",
  "pref": { "hiasan": "penuh", "objek": "tampil", "efek": "nyala", "kecepatan": "normal", "rapat": "normal", "hujan": "gerimis" } }
```

## 4. Realtime (Socket.IO)

Event `tema:berubah` dikirim ke room `user:<id>` setelah `PUT /me/tema` sukses, supaya tab/perangkat lain langsung ikut. Frontend sudah punya pola yang sama untuk antar-tab (listener `storage`); tinggal ditambah listener socket yang memanggil `NgumpulTheme.setTheme` / `setPref` tanpa menulis balik (hindari loop).

## 5. Sambungan ke frontend (yang diubah di sisi klien)

Mengikuti pola `NgumpulData` di `RENCANA_BACKEND.md` bagian 7:
```
NgumpulData.tema.ambil()            // data-lokal: baca localStorage | data-server: GET /me/tema
NgumpulData.tema.simpan(patch)      // data-lokal: tulis localStorage  | data-server: PUT /me/tema
NgumpulData.plus.status()
NgumpulData.plus.aktifkan()
```
Titik yang perlu disentuh di `theme.js`: fungsi `tulis(...)` dan `baca(...)` (semua akses localStorage lewat dua fungsi ini) dan `getPref/setPref`. Tema tetap diterapkan lebih dulu dari cache lokal supaya tidak ada kilatan tema saat halaman dibuka, lalu dikoreksi setelah respons server datang.

## 6. Uji yang diminta
- Akun tanpa Plus menyimpan tema premium → 403.
- Akun Plus menyimpan `pref.hujan = "badai"` → 400.
- Langganan habis → `GET` mengembalikan `tema_efektif` dasar, `id` asli tetap.
- Dua tab: ubah tema di satu tab, tab lain berubah via `tema:berubah`.
- `PUT` sebagian tidak menimpa field lain.

## 7. Perlu diputuskan bersama
1. Pengaturan gerak (`hiasan`, `kecepatan`, `rapat`) per akun atau per perangkat? (usulan: tema per akun, `hiasan` per perangkat)
2. Plus untuk tugas: cukup flag manual/langkah tab, atau buat simulasi pembayaran?
3. Apakah tema langit (`sky`) ikut disinkronkan, atau tetap lokal?

## 8. Urutan kerja
1. Migrasi `user_settings.tema` ke JSONB + tabel `subscriptions`.
2. `tema-daftar.js` + validator.
3. Endpoint `GET/PUT /me/tema`, lalu `/me/plus`.
4. `data-server.js` bagian `tema` dan `plus`.
5. Event socket, lalu uji bagian 6.
