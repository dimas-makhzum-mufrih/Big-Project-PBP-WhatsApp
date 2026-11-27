# Teks berformat Ngumpul

Berlaku di chat pribadi dan chat grup. Tombol **Aa** di kotak ketik membuka papan format (gaya + 64 warna). Pintasan: Ctrl+B / Ctrl+I / Ctrl+U.

## Gaya WhatsApp / Discord
| Ketik | Hasil |
|---|---|
| `*teks*` atau `**teks**` | **tebal** |
| `_teks_` | *miring* |
| `__teks__` | garis bawah |
| `~teks~` atau `~~teks~~` | ~~coret~~ |
| `\|\|teks\|\|` | spoiler (klik untuk buka) |
| `` `teks` `` | kode sebaris |
| ```` ```teks``` ```` | blok kode |
| `> teks` (di awal baris) | baris kode |

Penanda harus menempel pada kata (`*a b*` jadi tebal, `* a *` dan `5 * 3 * 2` tidak).

## Warna dan gaya (kurung kurawal + nomor, netral bahasa)
Bentuk: `{nomor: teks}`. Tanda tutupnya `}`, tidak perlu kode reset. Boleh bersarang: `{1: halo {9: dunia}}`.

Nomor **1-64** = urutan kotak di papan warna (tombol **Aa**), kiri ke kanan lalu atas ke bawah:
| Nomor | Tingkat |
|---|---|
| 1-16 | normal |
| 17-32 | terang |
| 33-48 | lembut (pastel) |
| 49-64 | gelap |

Urutan 16 warna dasar (tiap baris sama): 1 merah, 2 merah tua, 3 emas, 4 kuning, 5 hijau, 6 hijau tua, 7 aqua, 8 toska, 9 biru, 10 biru tua, 11 pink, 12 ungu, 13 putih, 14 abu muda, 15 abu tua, 16 hitam.
Jadi `{1: x}` merah, `{17: x}` merah terang, `{33: x}` merah lembut, `{49: x}` merah gelap. **16 x 4 = 64 warna.**

Warna bebas: `{#f80: teks}` atau `{#ff8800: teks}`.
Gaya: `{?: teks}` acak, `{%: teks}` pelangi. Boleh digabung: `{5 %: teks}`.
Kalau isi kurung bukan nomor 1-64 / hex / `?` / `%`, atau tidak ada `}` penutup, teks ditampilkan apa adanya.

## Catatan teknis
- `assets/js/format-teks.js` merender lewat DOM (tidak pakai innerHTML), jadi aman dari XSS. Pesan asli di penyimpanan tetap teks mentah.
- Dipasang lewat MutationObserver dan dimuat oleh `theme.js`, jadi `chat-tampil.js`, `grup.js`, dan `dashboard.html` tidak perlu diubah.
- Preview daftar chat, bilah sematan, dan preview grup menampilkan teks polos (tanda format dibuang).
- Backend: simpan teks mentah apa adanya; tidak ada perubahan skema.
