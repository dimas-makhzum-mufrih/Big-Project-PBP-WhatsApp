# Panduan API Ngumpul

| Bagian                                              | Gunakan untuk                                      |
| --------------------------------------------------- | -------------------------------------------------- |
| [Mulai cepat](#mulai-cepat)                         | URL dasar, sesi, dan contoh request                |
| [REST API](#rest-api)                               | Profil, teman, chat, grup, dan fitur aplikasi      |
| [Autentikasi Better Auth](#autentikasi-better-auth) | Daftar, login, OTP, Google, dan sesi               |
| [WebSocket](#websocket)                             | Menerima pesan dan perubahan secara real-time      |
| [Panggilan pribadi](#panggilan-pribadi)                 | Undangan telepon DM, riwayat, dan token media        |
| [LiveKit](#livekit)                                 | Panggilan audio, video, dan berbagi layar          |
| [Penyimpanan S3](#penyimpanan-s3)                   | Mengunggah atau membuka lampiran                   |
| [Konfigurasi layanan](#konfigurasi-layanan)         | Variabel lingkungan yang mengaktifkan tiap layanan |

## Mulai cepat

Gunakan `http://localhost:3000` saat menjalankan server lokal, atau `https://api.afadhili.my.id` untuk API publik. Endpoint WebSocket memakai `ws://localhost:3000` atau `wss://api.afadhili.my.id`.

Buka [Scalar API Reference](http://localhost:3000/docs) untuk mencoba endpoint HTTP, atau impor [spesifikasi OpenAPI](http://localhost:3000/openapi) ke klien API. Untuk endpoint yang memerlukan login, masukkan token sesi di bagian **Authentication** dengan skema **bearerAuth**, lalu buka **Test Request**.

Gunakan [Hono RPC](README.md#hono-rpc-for-typescript-clients) untuk memanggil route aplikasi dari TypeScript.

Untuk mencoba dari terminal, ambil token dari respons login yang berhasil. Ganti nilai contoh `TOKEN`, `user-b`, dan parameter seperti `:messageId` dengan nilai dari respons API.

```sh
API_URL=http://localhost:3000
TOKEN='<token sesi dari respons login>'

curl "$API_URL/health"

curl "$API_URL/api/me" \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT "$API_URL/api/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","displayName":"Alice"}'
```

Untuk aplikasi native, kirim `Authorization: Bearer <token>` dengan token hasil login. Browser juga bisa mengakses REST dengan Bearer dari origin mana pun menggunakan `credentials: "omit"`. Untuk login dari browser dan sesi cookie lintas origin, atur `CORS_ORIGIN` ke origin frontend, misalnya `http://localhost:5173`. Kirim cookie dengan `credentials: "include"`. Di HTTPS, cookie sesi memakai `Secure; SameSite=None`. Untuk contoh JSON di bawah, tambahkan `Content-Type: application/json`. Tanda **—** berarti request tanpa body atau query tambahan. Respons `204` tidak berisi body.

| Status       | Arti umum                                                         |
| ------------ | ----------------------------------------------------------------- |
| `400`        | Input tidak valid. Periksa body, query, atau ID.                  |
| `401`        | Sesi hilang, tidak valid, atau sudah berakhir.                    |
| `403`        | Akses dibatasi oleh origin, pertemanan, keanggotaan, atau peran.  |
| `404`        | Data tidak ada atau aksesnya disembunyikan.                       |
| `409`        | Konflik, misalnya username sudah diambil.                         |
| `410`        | Undangan, kode QR, atau izin upload kedaluwarsa.                  |
| `413`, `415` | Ukuran atau jenis konten tidak didukung. Body API maksimal 1 MiB. |
| `429`        | Permintaan auth terlalu sering. Tunggu sebelum mencoba lagi.      |
| `502`, `503` | Layanan pendukung gagal atau belum dikonfigurasi.                 |

Error REST biasanya berbentuk `{"error":"..."}`. Better Auth memakai `{"message":"...","code":"..."}`. Gunakan kode dan status untuk logika frontend. Server menjawab preflight CORS `OPTIONS` untuk `/api/*`.

<a id="5a-backlog-feature-endpoints"></a>

## REST API

Semua route REST memerlukan sesi kecuali yang ditandai **publik**. Contoh respons dalam tabel menunjukkan field utama. ID akun bersifat opaque dan waktu dikirim dalam format ISO 8601.

### Kesehatan, akun, dan profil

| Endpoint                                 | Contoh penggunaan                                                                                                                          | Respons dan catatan                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                            | **Publik.** Panggil untuk memeriksa apakah HTTP server merespons.                                                                          | `200 {"status":"ok"}`.                                                                                                                                                                                                                 |
| `GET /api/me`                            | Baca akun yang sedang login.                                                                                                               | `200 {user}` dengan `id`, `name`, `email`, `username`, `emailVerified`, dan `image`. Username bisa `null`.                                                                                                                             |
| `GET /api/profile`                       | Baca profil sebelum menampilkan atau mengeditnya.                                                                                          | `200 {profile}` dengan `username`, `displayName`, `bio`, `avatar`, `banner`, `location`, `website`, `pronouns`, `isPublic`, dan pengaturan visibilitas.                                                                                |
| `GET /api/profile/username-availability` | Query `?username=Alice` untuk memeriksa satu username sebelum menyimpan.                                                                   | `200 {"username":"alice","available":true}` bila tersedia. Kapitalisasi diabaikan, profil privat tetap dihitung, dan username milik sendiri dihitung tersedia. `400` jika format salah.                                                |
| `PUT /api/profile`                       | Body `{"username":"alice","displayName":"Alice","bio":"Halo","isPublic":true}`.                                                            | `200 {profile}`. `username` wajib, 3–24 huruf kecil, angka, atau garis bawah. Field opsional lain adalah `avatar` (URL HTTP/HTTPS). `409` jika username sudah diambil. Gunakan `null` untuk menghapus nama tampilan, bio, atau avatar. |
| `GET /api/users/search`                  | Query `?username=ali` untuk mencari pengguna publik berdasarkan awalan (2–24 karakter).                                                    | `200 {users:[{userId,username,displayName,avatar}]}`, maksimal 20. Pengguna sendiri, profil privat, dan hubungan blokir disaring.                                                                                                      |
| `GET /api/privacy`                       | Baca pengaturan privasi akun.                                                                                                              | `200 {privacy}` dengan `photoVisibility`, `onlineStatusVisibility`, dan `lastSeenVisibility`.                                                                                                                                          |
| `PUT /api/privacy`                       | Body `{"photoVisibility":"friends","lastSeenVisibility":"nobody"}`. Kirim minimal satu field dari respons GET.                             | `200 {privacy}`. Nilai pilihan `everyone`, `friends`, atau `nobody`.                                                                                                                                                                   |
| `GET /api/blocks`                        | Ambil daftar pengguna yang diblokir oleh akun ini.                                                                                         | `200 {blocked:[{userId,username,name,displayName,blockedAt}]}`.                                                                                                                                                                        |
| `POST /api/users/:userId/block`          | Ganti `:userId` dengan ID pengguna yang ingin diblokir.                                                                                    | `204`. Memutus pertemanan, membatalkan atau menolak permintaan terkait, dan menutup socket DM.                                                                                                                                         |
| `DELETE /api/users/:userId/block`        | Ganti `:userId` dengan ID pengguna yang ingin dibuka blokirnya.                                                                            | `204`, atau `404` jika blokir tidak ditemukan.                                                                                                                                                                                         |
| `POST /api/users/:userId/reports`        | Body `{"reason":"spam","details":"Mengirim pesan berulang"}`. Alasan lain `harassment`, `impersonation`, `inappropriate_content`, `other`. | `201 {report}`. `details` opsional, maksimal 1000 karakter. `409` jika sudah pernah melaporkan pengguna itu.                                                                                                                           |

Untuk onboarding, baca `/api/me` atau `/api/profile`. Jika `username` kosong, cek pilihan dengan `/api/profile/username-availability` lalu simpan melalui `PUT /api/profile`. Hasil pengecekan dapat berubah sebelum penyimpanan, jadi tangani `409` dari PUT.

### Pertemanan dan QR

| Endpoint                                        | Contoh penggunaan                                                                                | Respons dan catatan                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `GET /api/friends`                              | Tampilkan kontak yang sudah berteman.                                                            | `200 {friends:[{userId,username,displayName,avatar}]}`.                                      |
| `GET /api/friends/requests`                     | Ambil permintaan masuk dan keluar yang masih menunggu.                                           | `200 {incoming, outgoing}`. Simpan `id` tiap permintaan untuk tindakan berikutnya.           |
| `POST /api/friends/requests`                    | Body `{"username":"bob"}`.                                                                       | `201 {request}` berstatus `pending`. `409` jika sudah berteman atau ada permintaan tertunda. |
| `POST /api/friends/requests/:requestId/accept`  | Penerima memakai `id` dari `incoming`.                                                           | `200 {request}` berstatus `accepted`. Pertemanan terbentuk.                                  |
| `POST /api/friends/requests/:requestId/decline` | Penerima memakai `id` dari `incoming`.                                                           | `200 {request}` berstatus `declined`.                                                        |
| `POST /api/friends/requests/:requestId/cancel`  | Pengirim memakai `id` dari `outgoing`.                                                           | `200 {request}` berstatus `canceled`.                                                        |
| `DELETE /api/friends/:userId`                   | Gunakan ID teman yang ingin dihapus.                                                             | `204`. Socket DM terkait ditutup.                                                            |
| `GET /api/friends/qr`                           | Query opsional `?expiresInSeconds=3600`. Gunakan `qr.deepLink` atau `qr.httpUrl` sebagai isi QR. | `200 {qr}` dengan `code` dan batas waktu. Masa berlaku 60–86400 detik, default 3600.         |
| `GET /api/friends/qr/:code`                     | Buka kode hasil pemindaian untuk preview sebelum mengirim permintaan.                            | `200 {qr:{user,expiresAt,canRequest,alreadyFriends,blocked}}`. `410` jika kedaluwarsa.       |
| `POST /api/friends/qr/claim`                    | Body `{"code":"kode-hasil-pindai"}`.                                                             | `201 {request,user}`. Membuat permintaan pertemanan, lalu penerima perlu menyetujui.         |

### Chat pribadi

DM membutuhkan pertemanan aktif tanpa blokir. Saat mengirim DM atau pesan channel, klien dapat menyertakan `clientMessageId` dan menggunakannya kembali untuk percobaan ulang payload yang sama. Kuncinya berlaku per pengirim dan percakapan selama setidaknya 24 jam. Menggunakan kunci yang sama untuk payload berbeda mengembalikan `409`. `:peerId` adalah ID pengguna lawan bicara. Untuk riwayat DM dan channel, `limit` bernilai 1–100 (default 50), urutan di setiap halaman dari lama ke baru. Pakai `nextCursor` sebagai `before` untuk halaman sebelumnya.

| Endpoint                                                  | Contoh penggunaan                                                                                                | Respons dan catatan                                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/direct-messages/:peerId`                        | Query `?limit=20&before=id-pesan`. Hilangkan `before` untuk halaman terbaru.                                     | `200 {messages,nextCursor}`. Pesan memiliki `id`, `senderId`, `recipientId`, `text`, `createdAt`, `status`, dan metadata. |
| `POST /api/direct-messages/:peerId`                       | Body `{"text":"Halo","replyToMessageId":"id-pesan"}`.                                                            | `201 {message}`. Lihat [body pesan](#body-pesan).                                                                         |
| `PATCH /api/direct-messages/:messageId`                   | Body `{"text":"Halo lagi"}`. Hanya pengirim.                                                                     | `200 {message}` yang telah diperbarui.                                                                                    |
| `DELETE /api/direct-messages/:messageId`                  | Query wajib `?scope=me` untuk sembunyikan bagi diri sendiri atau `?scope=everyone` untuk semua (hanya pengirim). | `204`. Penghapusan untuk semua meninggalkan penanda `deletedAt`.                                                          |
| `POST /api/direct-messages/:messageId/receipts`           | Body `{"status":"read"}` atau `{"status":"delivered"}`. Hanya penerima.                                          | `200 {status,upToMessageId,updatedCount}`. Status `read` juga menandai pesan masuk sebelumnya.                            |
| `POST /api/direct-messages/:messageId/reactions`          | Body `{"emoji":"👍"}`.                                                                                           | `200 {messageId,reactions}`. Setiap ringkasan memuat `emoji`, `count`, `userIds`, dan `me`.                               |
| `DELETE /api/direct-messages/:messageId/reactions/:emoji` | Ganti `:emoji` dengan emoji yang di-URL-encode, misalnya `%F0%9F%91%8D`.                                         | `200 {messageId,reactions}`. Menghapus reaksi akun ini.                                                                   |
| `GET /api/direct-messages/:peerId/pins`                   | Tampilkan daftar sematan chat ini.                                                                               | `200 {messages}`.                                                                                                         |
| `POST /api/direct-messages/:messageId/pin`                | Sematkan pesan yang melibatkan akun ini.                                                                         | `201 {pinned,messageId}`, atau `200` jika sudah disematkan.                                                               |
| `DELETE /api/direct-messages/:messageId/pin`              | Lepas sematan untuk ID pesan ini.                                                                                | `204`, atau `404` jika sematan tidak ditemukan.                                                                           |

### Grup, channel, dan anggota

Satu grup disebut **server** di API. Peran yang tersedia adalah `owner`, `admin`, dan `member`. Buat grup dengan POST untuk mendapatkan `server.id` dan channel teks `general`. Channel suara dibahas di [LiveKit](#livekit).

| Endpoint                                            | Contoh penggunaan                                                                                                     | Respons dan catatan                                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/servers`                                  | Ambil grup tempat akun ini menjadi anggota.                                                                           | `200 {servers}`. Tiap item memuat `id`, `name`, `role`, dan `joinedAt`.                                                        |
| `POST /api/servers`                                 | Body `{"name":"Kelas A","description":"Ruang belajar"}`. Nama 2–80 karakter, deskripsi opsional.                      | `201 {server}`. Pembuat menjadi owner dan channel teks `general` dibuat.                                                       |
| `PATCH /api/servers/:serverId`                      | Body `{"name":"Kelas B"}`, atau kirim `description` dan/atau `icon` (URL HTTP/HTTPS). Owner/admin.                    | `200 {server}`.                                                                                                                |
| `DELETE /api/servers/:serverId`                     | Owner menghapus grup dengan ID ini.                                                                                   | `204`. Channel, pesan, dan keanggotaan grup ikut terhapus.                                                                     |
| `POST /api/servers/:serverId/invites`               | Body opsional `{"expiresInSeconds":3600,"maxUses":5}`. Owner/admin.                                                   | `201 {invite}`. Default 7 hari tanpa batas penggunaan, `null` untuk tanpa kedaluwarsa atau tanpa batas.                        |
| `POST /api/servers/invites/:code/join`              | Masukkan `invite.code` pada URL untuk bergabung.                                                                      | `201 {serverId,joined}`. `409` jika sudah menjadi anggota, `410` bila undangan habis.                                          |
| `GET /api/servers/:serverId/channels`               | Daftar channel grup untuk anggota.                                                                                    | `200 {channels}`. Tiap channel memuat `id`, `name`, `kind`, dan `position`.                                                    |
| `POST /api/servers/:serverId/channels`              | Body `{"name":"Ruang Belajar","kind":"voice"}`. `kind` bisa `text` atau `voice`; `description` opsional. Owner/admin. | `201 {channel}`. Nama dinormalisasi menjadi huruf kecil dan spasi menjadi tanda hubung. `409` jika nama sudah dipakai di grup. |
| `PATCH /api/servers/:serverId/channels/:channelId`  | Body `{"name":"diskusi","position":2}`. Field lain `description`. Owner/admin.                                        | `200 {channel}`. Jenis channel tetap.                                                                                          |
| `DELETE /api/servers/:serverId/channels/:channelId` | Owner/admin menghapus channel dengan ID ini.                                                                          | `204`. Pesan channel ikut terhapus.                                                                                            |
| `GET /api/servers/:serverId/members`                | Tampilkan anggota grup.                                                                                               | `200 {members}` dengan `userId`, `username`, `displayName`, `avatar`, dan `role` per anggota.                                  |
| `POST /api/servers/:serverId/members`               | Body `{"username":"bob"}` atau `{"userId":"user-b"}`. Owner/admin.                                                    | `201 {member}`. `409` jika sudah menjadi anggota.                                                                              |
| `PATCH /api/servers/:serverId/members/:userId`      | Body `{"role":"admin"}` atau `{"role":"member"}`. Hanya owner yang bisa mengubah peran anggota lain.                  | `200 {member}`. Peran owner tetap.                                                                                             |
| `DELETE /api/servers/:serverId/members/:userId`     | Anggota memakai ID sendiri untuk keluar. Owner bisa menghapus admin/member, admin hanya member.                       | `204`. Owner tidak dapat dikeluarkan atau keluar melalui endpoint ini.                                                         |

### Chat channel dan status baca

Gunakan ID grup dan channel **teks** dari daftar channel. Akses memerlukan keanggotaan di grup tersebut.

| Endpoint                                                                                 | Contoh penggunaan                                                                                               | Respons dan catatan                                                                     |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/servers/:serverId/channels/:channelId/messages`                                | Query `?limit=50` atau `?limit=50&before=id-pesan`.                                                             | `200 {messages,nextCursor}`. Pesan channel memiliki `channelId`; `replyTo` bisa `null`. |
| `POST /api/servers/:serverId/channels/:channelId/messages`                               | Body `{"text":"Selamat datang"}`. Owner/admin bisa menambahkan `"isAnnouncement":true`.                         | `201 {message}`. Lihat [body pesan](#body-pesan).                                       |
| `PATCH /api/servers/:serverId/channels/:channelId/messages/:messageId`                   | Body `{"text":"Selamat datang semua"}`. Hanya pengirim.                                                         | `200 {message}`.                                                                        |
| `DELETE /api/servers/:serverId/channels/:channelId/messages/:messageId`                  | Query wajib `?scope=me` untuk sembunyikan atau `?scope=everyone` untuk hapus bagi semua (pengirim/owner/admin). | `204`. Untuk semua, pesan menyisakan penanda `deletedAt`.                               |
| `POST /api/servers/:serverId/channels/:channelId/messages/:messageId/reactions`          | Body `{"emoji":"👍"}`.                                                                                          | `200 {messageId,reactions}`.                                                            |
| `DELETE /api/servers/:serverId/channels/:channelId/messages/:messageId/reactions/:emoji` | Ganti `:emoji` dengan `%F0%9F%91%8D` untuk menghapus 👍 milik akun ini.                                         | `200 {messageId,reactions}`.                                                            |
| `GET /api/servers/:serverId/channels/:channelId/pins`                                    | Ambil semua sematan di channel.                                                                                 | `200 {messages}`.                                                                       |
| `POST /api/servers/:serverId/channels/:channelId/messages/:messageId/pin`                | Sematkan pesan yang dapat dibaca anggota channel.                                                               | `201 {pinned,messageId}`, atau `200` jika sudah disematkan.                             |
| `DELETE /api/servers/:serverId/channels/:channelId/messages/:messageId/pin`              | Lepas sematan berdasarkan ID pesan.                                                                             | `204`, atau `404` jika sematan tidak ditemukan.                                         |
| `GET /api/channels/:channelId/read-state`                                                | Baca penanda terakhir untuk akun ini.                                                                           | `200 {readState}` dengan `lastReadMessageId`, `lastReadAt`, dan `markedUnread`.         |
| `PUT /api/channels/:channelId/read-state`                                                | Body `{"messageId":"id-pesan-terakhir"}` atau `{"markedUnread":true}`.                                          | `200 {readState}`. ID pesan harus berasal dari channel ini.                             |
| `GET /api/servers/:serverId/unread`                                                      | Tampilkan jumlah pesan belum dibaca per channel grup.                                                           | `200 {channels}` dengan `channelId`, `unreadCount`, dan `lastMessageAt`.                |

### Body pesan

Untuk mengirim pesan DM atau channel, sertakan minimal satu dari `text` (maksimal 4000 karakter), `attachmentId` (lampiran siap pakai di percakapan yang sama), `location`, atau `poll`. `replyToMessageId` opsional dan harus berasal dari percakapan yang sama.

| Field tambahan         | Contoh dan aturan                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forwardedFromId`      | `"id-pesan-asal"` yang dapat dibaca oleh pengirim. Untuk tujuan baru, pakai endpoint forward di bawah.                                                                                                                                                  |
| `location`             | `{"lat":-6.2,"lng":106.8,"label":"Lokasi bertemu"}`. Label opsional, maksimal 200 karakter.                                                                                                                                                             |
| `attachmentDurationMs` | `1500` untuk audio atau video, 1–86400000 ms.                                                                                                                                                                                                           |
| `expiresInSeconds`     | `300` untuk pesan sementara, 5–604800 detik. Default mengikuti preferensi percakapan.                                                                                                                                                                   |
| `poll`                 | `{"question":"Makan di mana?","options":["Kantin","Luar"],"allowMultiple":false,"anonymous":false}`. Pertanyaan maksimal 300 karakter, 2–12 pilihan, tiap pilihan maksimal 100 karakter. `closesAt` opsional, waktu ISO di masa depan maksimal 90 hari. |
| `encrypted`            | `true` jika `text` berisi ciphertext dari klien. Server menyimpan teks tersebut apa adanya.                                                                                                                                                             |
| `isAnnouncement`       | `true` untuk pengumuman channel. Owner/admin.                                                                                                                                                                                                           |

Riwayat pesan dapat memuat `replyTo`, `attachmentId`, `editedAt`, `deletedAt`, `reactions`, `mentions`, `poll`, `pinned`, dan `expiresAt`. Mention `@username` dicocokkan ke teman DM atau anggota grup sesuai konteks.

### Pencarian pesan, penerusan, dan polling

Pencarian membutuhkan `q` (1–200 karakter). Filter opsional `senderId`, `before` dan `after` (waktu ISO), `hasAttachment=true`, serta `limit` (1–50, default 25). `before` pada pencarian adalah waktu, sedangkan `before` pada riwayat adalah ID pesan.

| Endpoint                                                         | Contoh penggunaan                                                                                             | Respons dan catatan                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/messages/search`                                       | Query `?q=tugas&peerId=user-b`. Hilangkan `peerId` untuk mencari di semua DM yang bisa dibaca.                | `200 {messages,nextCursor}`. Hasil memuat konteks `peer`.                                                                                         |
| `GET /api/messages/search/channels`                              | Query `?q=kelas&limit=20`.                                                                                    | `200 {messages,nextCursor}` dari channel teks grup yang diikuti.                                                                                  |
| `GET /api/servers/:serverId/channels/:channelId/messages/search` | Query `?q=jadwal` untuk membatasi pencarian ke satu channel.                                                  | `200 {messages,nextCursor}`, atau `404` jika channel tidak dapat diakses.                                                                         |
| `POST /api/messages/:messageId/forward`                          | Body `{"scope":"direct","targetId":"user-b"}` atau `{"scope":"channel","targetId":"id-channel"}`.             | `201 {message}`. Perlu akses baca sumber dan akses tulis tujuan. Pesan dengan lampiran ditolak dengan `400`.                                      |
| `GET /api/polls/:pollId`                                         | Ambil `poll.id` dari record pesan berisi polling.                                                             | `200 {poll}` dengan opsi, jumlah suara, pilihan akun ini, dan status penutupan.                                                                   |
| `POST /api/polls/:pollId/votes`                                  | Body `{"optionIds":["opsi-a","opsi-b"]}` untuk pilihan ganda atau `{"optionId":"opsi-a"}` untuk satu pilihan. | `200 {poll}`. Pada polling tunggal, pilihan lama diganti. Pada polling ganda, pilihan yang dikirim ditambahkan. `409` jika polling sudah ditutup. |
| `DELETE /api/polls/:pollId/votes`                                | Tarik suara akun ini.                                                                                         | `200 {poll}`. `409` jika polling ditutup.                                                                                                         |
| `POST /api/polls/:pollId/close`                                  | Pembuat polling dapat menutup pemungutan suara. Untuk polling channel, owner/admin grup juga bisa menutupnya. | `200 {poll}` dengan status terbaru.                                                                                                               |

### Percakapan, draf, dan pesan terjadwal

`scope` bernilai `direct` atau `channel`. Untuk `direct`, `targetId` dapat berupa ID teman atau kunci percakapan `<idA>:<idB>` (kedua ID diurutkan). Untuk `channel`, pakai ID channel. Draf dan preferensi percakapan bersifat pribadi.

| Endpoint                                             | Contoh penggunaan                                                                                                                                                 | Respons dan catatan                                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/conversations`                             | Query opsional `?scope=direct&favorite=true`. Filter lain `archived`.                                                                                             | `200 {conversations}`. Hanya percakapan yang preferensinya sudah tersimpan, diurutkan menurut `sortOrder`.                                                                                                    |
| `GET /api/conversations/:scope/:targetId`            | Baca preferensi untuk satu percakapan.                                                                                                                            | `200 {preference}`. Mengembalikan nilai default bila belum diatur.                                                                                                                                            |
| `PATCH /api/conversations/:scope/:targetId`          | Body `{"favorite":true,"muteForSeconds":3600}`. Kirim minimal satu field.                                                                                         | `200 {preference}`. Juga menerima `archived`, `markedUnread`, `mutedUntil` (ISO atau `null`), `notificationLevel` (`all`, `mentions`, `none`), `disappearingSeconds` (5–604800 atau `null`), dan `sortOrder`. |
| `GET /api/drafts`                                    | Ambil draf akun ini untuk memulihkan isi komposer.                                                                                                                | `200 {drafts}` dengan `scope`, `targetId`, `text`, `replyToMessageId`, dan `updatedAt`.                                                                                                                       |
| `PUT /api/drafts/:scope/:targetId`                   | Body `{"text":"Pesan belum selesai","replyToMessageId":null}`.                                                                                                    | `200 {draft}`. Jika teks kosong dan tak ada balasan, draf dihapus dan responsnya `204`.                                                                                                                       |
| `DELETE /api/drafts/:scope/:targetId`                | Buang draf pada percakapan ini.                                                                                                                                   | `204`, atau `404` jika tidak ada draf.                                                                                                                                                                        |
| `GET /api/scheduled-messages`                        | Query opsional `?scope=direct&targetId=user-b&status=pending`. Status lain `sent`, `canceled`, `failed`.                                                          | `200 {scheduledMessages}`, maksimal 200 baris.                                                                                                                                                                |
| `POST /api/scheduled-messages`                       | Body `{"scope":"direct","targetId":"user-b","text":"Pengingat","scheduledFor":"WAKTU_ISO"}`. Ganti `WAKTU_ISO` dengan waktu 5 detik sampai 1 tahun dari sekarang. | `201 {scheduledMessage}`. Wajib ada teks atau `attachmentId`; boleh menambahkan `replyToMessageId`.                                                                                                           |
| `PATCH /api/scheduled-messages/:scheduledMessageId`  | Body `{"text":"Pengingat baru"}`, atau ubah `scheduledFor` dan/atau `replyToMessageId`.                                                                           | `200 {scheduledMessage}`. `409` jika tidak lagi `pending`.                                                                                                                                                    |
| `DELETE /api/scheduled-messages/:scheduledMessageId` | Batalkan pesan milik akun ini yang masih `pending`.                                                                                                               | `204`, atau `404` jika tidak bisa dibatalkan.                                                                                                                                                                 |

Alternatif untuk menghitung jadwal 5 menit ke depan di JavaScript adalah `new Date(Date.now() + 5 * 60_000).toISOString()`. Worker memeriksa ulang akses dan status lampiran saat mengirim. Jika gagal, record diberi status `failed` dan `failureReason`. Worker juga membersihkan pesan sementara yang kedaluwarsa.

### Notifikasi, presence, dan preferensi akun

| Endpoint                                       | Contoh penggunaan                                                                             | Respons dan catatan                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/notifications`                       | Query `?unread=true&limit=20`. Untuk halaman berikutnya tambahkan `before` dari `nextCursor`. | `200 {notifications,nextCursor,unreadCount}`. `limit` 1–100, default 50.         |
| `GET /api/notifications/unread-count`          | Gunakan untuk badge jumlah notifikasi.                                                        | `200 {unreadCount}`.                                                             |
| `POST /api/notifications/:notificationId/read` | Tandai satu notifikasi sudah dibaca.                                                          | `200 {notification}` dengan `readAt`; aman dipanggil ulang.                      |
| `POST /api/notifications/read-all`             | Tandai semua notifikasi akun ini sudah dibaca.                                                | `200 {updatedCount}`.                                                            |
| `DELETE /api/notifications/:notificationId`    | Hapus satu notifikasi milik akun ini.                                                         | `204`.                                                                           |
| `DELETE /api/notifications/read`               | Bersihkan semua notifikasi yang sudah dibaca.                                                 | `200 {deletedCount}`.                                                            |
| `GET /api/presence`                            | Ambil status kehadiran teman.                                                                 | `200 {presences}`. Status dapat disaring oleh aturan visibilitas.                |
| `GET /api/presence/:userId`                    | Baca kehadiran satu pengguna, atau akun sendiri.                                              | `200 {presence:{userId,status,lastSeenAt,updatedAt}}`. `403` jika disembunyikan. |
| `PUT /api/presence`                            | Body `{"status":"online"}`, `"away"`, atau `"offline"` pada field `status`.                   | `200 {presence}`.                                                                |
| `GET /api/preferences`                         | Baca preferensi tampilan dan notifikasi.                                                      | `200 {preferences}`, termasuk nilai default.                                     |
| `PUT /api/preferences`                         | Body `{"theme":"dark","textSize":"large","notifyMentions":true}`. Kirim minimal satu field.   | `200 {preferences}`. Opsi tambahan ada di bawah.                                 |

Preferensi lain yang bisa dikirim melalui `PUT /api/preferences`:

- `theme`: `system`, `light`, `dark`. `textSize`: `small`, `medium`, `large`.
- `wallpaper` dan `bubbleColor`: string maksimal 2048 karakter atau `null`.
- `chatListSort`: `recent`, `unread`, `name`. `chatListFilter`: `all`, `unread`, `favorites`, `direct`, `groups`.
- `notifyDirectMessages`, `notifyChannels`, dan `notifyMentions`: boolean.
- `settings`: objek maksimal 8192 byte. Contoh `{"presenceVisibility":"friends"}` dengan pilihan `everyone`, `friends`, atau `nobody`.

### Backup dan penerjemahan

| Endpoint                          | Contoh penggunaan                                                                                                                                            | Respons dan catatan                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/backup`                 | Ekspor data akun ini sebelum pemulihan atau migrasi data.                                                                                                    | `200 {backup}`, dengan `version:1`, akun, profil, preferensi, draf, dan data terkait. Batas ekspor 500 notifikasi serta masing-masing 5000 pesan DM dan channel.  |
| `POST /api/backup/restore`        | Kirim hasil `GET /api/backup` sebagai body JSON, atau isi `backup` saja.                                                                                     | `200 {restored:{directMessagesImported,channelMessagesImported,draftsImported,skipped}}`. Impor bersifat menambah data dan memerlukan akses ke percakapan tujuan. |
| `GET /api/translations/languages` | Isi pilihan bahasa untuk fitur terjemahan.                                                                                                                   | `200 {languages:[{code,name}]}`. `503` jika layanan terjemahan belum disetel.                                                                                     |
| `POST /api/translations`          | Body `{"text":"Hello","sourceLanguage":"en","targetLanguage":"id"}`. Teks maksimal 4000 karakter. `sourceLanguage` boleh dihilangkan untuk deteksi otomatis. | `200 {translation:{text,sourceLanguage,targetLanguage}}`. Baca hasil di `translation.text`.                                                                       |

Pemulihan menerima backup versi 1. Pesan impor diatribusikan ke akun yang melakukan pemulihan, dan draf digabung. Siapkan file secara lokal sebelum mengunggahnya agar ukuran body tetap dalam batas API.

## Autentikasi Better Auth

Tambahkan awalan `/api/auth` ke path di bagian ini. Misalnya `POST /sign-in/email` berarti `POST /api/auth/sign-in/email`. Kolom **Sesi** menunjukkan apakah akun perlu login dulu.

### Daftar, login, dan OTP

Alur utama adalah `sign-up/email → email-otp/verify-email → sign-in/email`. Server otomatis mengirim OTP saat pendaftaran dan dapat mengirim ulang saat akun yang belum terverifikasi mencoba login. OTP berisi 6 angka, berlaku 10 menit, dan dibatasi 5 percobaan per kode. Di lokal, lihat email di Mailpit (`http://localhost:8025`).

```sh
curl "$API_URL/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.test","password":"ContohSandi123!"}'
```

Gunakan token hasil login sebagai `TOKEN` pada contoh REST. Klien browser yang memakai sesi cookie dapat menyimpan cookie dari respons login.

| Endpoint                                 | Sesi  | Contoh penggunaan                                                                                                   | Respons dan catatan                                                                                                             |
| ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /ok`                                | Tidak | Periksa apakah handler Better Auth merespons.                                                                       | `200 {"ok":true}`.                                                                                                              |
| `POST /sign-up/email`                    | Tidak | `{"name":"Alice","email":"alice@example.test","password":"ContohSandi123!"}`. Kata sandi minimal 8 karakter.        | `200 {user,token:null}`. Username ditetapkan melalui profil setelah login.                                                      |
| `POST /sign-in/email`                    | Tidak | `{"email":"alice@example.test","password":"ContohSandi123!"}`. Opsional `rememberMe` dan `callbackURL`.             | `200 {user,token,...}` dan cookie sesi. Email harus terverifikasi.                                                              |
| `POST /email-otp/send-verification-otp`  | Tidak | `{"email":"alice@example.test","type":"email-verification"}`. Pakai `sign-in` untuk login via OTP.                  | `200 {"success":true}`. Kode hanya dikirim melalui email.                                                                       |
| `POST /email-otp/check-verification-otp` | Tidak | `{"email":"alice@example.test","type":"email-verification","otp":"123456"}`.                                        | `200 {"success":true}` jika kode valid. Kode belum dikonsumsi.                                                                  |
| `POST /email-otp/verify-email`           | Tidak | `{"email":"alice@example.test","otp":"123456"}`.                                                                    | `200 {status:true,token:null,user}`. Setelah berhasil, panggil login.                                                           |
| `POST /sign-in/email-otp`                | Tidak | Setelah meminta OTP bertipe `sign-in`, kirim `{"email":"alice@example.test","otp":"123456"}`.                       | `200 {user,token}` dan cookie sesi. Dapat membuat akun terverifikasi jika belum ada.                                            |
| `POST /email-otp/request-password-reset` | Tidak | `{"email":"alice@example.test"}`.                                                                                   | `200 {"success":true}` termasuk untuk email yang tidak dikenal.                                                                 |
| `POST /email-otp/reset-password`         | Tidak | `{"email":"alice@example.test","otp":"123456","password":"ContohSandiBaru123!"}`.                                   | `200 {"success":true}`. Kode dikonsumsi, sesi lama dicabut, dan pengguna dapat login dengan sandi baru.                         |
| `POST /forget-password/email-otp`        | Tidak | `{"email":"alice@example.test"}` untuk klien lama.                                                                  | Alias usang. Klien baru memakai `/email-otp/request-password-reset`.                                                            |
| `POST /send-verification-email`          | Tidak | `{"email":"alice@example.test"}` untuk klien Better Auth yang memakai route bawaan.                                 | `200 {status:true}`. Konfigurasi plugin mengganti pengiriman verifikasi bawaan menjadi OTP. Gunakan route OTP untuk alur utama. |
| `GET /verify-email`                      | Tidak | `?token=token-verifikasi&callbackURL=<url-frontend>` jika memiliki token tautan.                                    | Verifikasi tautan Better Auth. Alur pendaftaran Ngumpul mengirim kode OTP.                                                      |
| `POST /request-password-reset`           | Tidak | `{"email":"alice@example.test","redirectTo":"http://localhost:5173/reset-password"}` untuk alur tautan Better Auth. | Pengirim tautan reset belum dikonfigurasi. Gunakan alur reset OTP.                                                              |
| `GET /reset-password/:token`             | Tidak | Buka tautan reset dengan `?callbackURL=<url-reset-frontend>`.                                                       | Mengalihkan ke callback dengan token valid atau indikator error. Bergantung pada token reset berbasis tautan.                   |
| `POST /reset-password`                   | Tidak | `{"token":"token-reset","newPassword":"ContohSandiBaru123!"}` untuk menukar token tautan.                           | `200 {status:true}` dengan token valid. Gunakan endpoint OTP untuk kode enam angka.                                             |

### Google OAuth

Google aktif bila `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` disetel. Daftarkan redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google` pada konfigurasi Google OAuth.

| Endpoint               | Sesi  | Contoh penggunaan                                                                                                                | Respons dan catatan                                                                                |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /google/start`    | Tidak | Navigasikan halaman ke `?callbackURL=<url-frontend>&errorCallbackURL=<url-frontend>`.                                            | `302` ke Google. Callback harus berada pada origin yang dipercaya. Hasil mengandalkan cookie sesi. |
| `POST /sign-in/social` | Tidak | Klien same-origin dapat mengirim `{"provider":"google","callbackURL":"http://localhost:5173/dashboard","disableRedirect":true}`. | Mengembalikan `{url,redirect}`; arahkan klien ke `url`.                                            |
| `GET /callback/:id`    | Tidak | Google mengarahkan browser ke `/callback/google?code=...&state=...`.                                                             | Menukar kode, menyetel cookie sesi, lalu mengalihkan browser ke URL callback.                      |
| `POST /callback/:id`   | Tidak | Callback provider yang mengirim `code` dan `state` melalui POST. Gunakan ID provider yang dikonfigurasi.                         | Ditangani Better Auth. Klien aplikasi memulai login dari route start.                              |
| `GET /error`           | Tidak | URL tujuan kegagalan auth. Contoh `?error=access_denied`.                                                                        | Halaman error pada development atau redirect pada produksi.                                        |

Frontend dapat memulai login Google dengan navigasi halaman:

```js
const url = new URL("/api/auth/google/start", apiUrl);
url.search = new URLSearchParams({
    callbackURL: new URL("/dashboard", window.location.origin).href,
    errorCallbackURL: new URL("/login", window.location.origin).href,
}).toString();
window.location.assign(url);
```

Setelah redirect, panggil `GET /api/auth/get-session` dengan `credentials: "include"` untuk membaca sesi dari cookie.

### Sesi dan akun tertaut

| Endpoint                      | Sesi     | Contoh penggunaan                                                                               | Respons dan catatan                                                                        |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /get-session`            | Opsional | Kirim cookie atau bearer untuk memulihkan sesi frontend.                                        | `200 {session,user}` jika valid, atau `200 null`.                                          |
| `POST /get-session`           | Ya       | Gunakan tanpa body untuk refresh sesi tertunda jika `session.deferSessionRefresh` diaktifkan.   | `405` pada konfigurasi saat ini. Gunakan GET.                                              |
| `POST /sign-out`              | Opsional | Tanpa body untuk keluar dari sesi ini. Kirim sesi yang ingin diakhiri.                          | `200 {success:true}` dan cookie sesi dihapus. Respons tetap sukses jika sesi sudah hilang. |
| `GET /list-sessions`          | Ya       | Tampilkan perangkat yang masih memiliki sesi aktif.                                             | `200` berupa array sesi dengan `token` dan `expiresAt`.                                    |
| `POST /revoke-session`        | Ya       | `{"token":"token-sesi-dari-list-sessions"}`.                                                    | `200 {status:true}`. Mencabut satu sesi milik pemanggil.                                   |
| `POST /revoke-sessions`       | Ya       | Cabut semua sesi milik akun ini, termasuk sesi sekarang.                                        | `200 {status:true}`.                                                                       |
| `POST /revoke-other-sessions` | Ya       | Keluar dari perangkat lain dan pertahankan sesi sekarang.                                       | `200 {status:true}`.                                                                       |
| `POST /change-password`       | Ya       | `{"currentPassword":"SandiLama123!","newPassword":"SandiBaru123!","revokeOtherSessions":true}`. | `200 {user,token}`; token baru dapat diterbitkan saat sesi lain dicabut.                   |
| `POST /verify-password`       | Ya       | `{"password":"ContohSandi123!"}` untuk memeriksa kata sandi akun yang sedang login.             | `200 {status:true}` jika cocok. `400` jika kata sandi salah.                               |
| `POST /update-user`           | Ya       | `{"name":"Alice","image":"https://example.test/avatar.png"}`.                                   | `200 {status:true}`. Simpan username lewat `PUT /api/profile`.                             |
| `GET /list-accounts`          | Ya       | Ambil daftar akun tertaut sebelum memilih akun Google.                                          | `200` berupa array akun. Gunakan `id` milik akun Better Auth untuk operasi akun.           |
| `POST /link-social`           | Ya       | `{"provider":"google","callbackURL":"http://localhost:5173/settings"}`.                         | Memulai OAuth untuk menautkan Google ke akun saat ini.                                     |
| `POST /unlink-account`        | Ya       | `{"accountId":"id-dari-list-accounts"}`. Memerlukan sesi yang masih baru.                       | `200 {status:true}`. Akun tertaut terakhir dilindungi.                                     |
| `GET /account-info`           | Ya       | Query `?accountId=id-dari-list-accounts` untuk akun Google yang tertaut.                        | `200 {user,data,account}` dari provider.                                                   |
| `POST /get-access-token`      | Ya       | `{"accountId":"id-dari-list-accounts"}`.                                                        | Mengembalikan access token provider, dengan refresh bila perlu.                            |
| `POST /refresh-token`         | Ya       | `{"accountId":"id-dari-list-accounts"}`. Memerlukan refresh token dari provider.                | Mengembalikan token provider yang diperbarui.                                              |

Access token provider berbeda dari token sesi Ngumpul. Untuk request REST Ngumpul, gunakan token sesi dari login atau pemulihan sesi.

### Fitur Better Auth yang perlu konfigurasi tambahan

| Endpoint                               | Contoh penggunaan bila fitur aktif                                                       | Konfigurasi saat ini                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /change-email`                   | Dengan sesi, kirim `{"newEmail":"baru@example.test"}` untuk alur email bawaan.           | Ubah email bawaan masih nonaktif.                                |
| `POST /email-otp/request-email-change` | Dengan sesi, kirim `{"newEmail":"baru@example.test"}` untuk meminta OTP.                 | Ubah email via OTP masih nonaktif.                               |
| `POST /email-otp/change-email`         | Dengan sesi, kirim `{"newEmail":"baru@example.test","otp":"123456"}`.                    | Ubah email via OTP masih nonaktif.                               |
| `POST /update-session`                 | Dengan sesi, kirim objek berisi field tambahan sesi yang dikonfigurasi.                  | Server belum memiliki field sesi tambahan yang dapat diperbarui. |
| `POST /delete-user`                    | Dengan sesi baru, kirim `{"password":"ContohSandi123!"}` untuk meminta penghapusan akun. | Penghapusan akun masih nonaktif.                                 |
| `GET /delete-user/callback`            | Buka tautan konfirmasi dengan `?token=token-hapus` dan opsional `callbackURL`.           | Penghapusan akun masih nonaktif.                                 |

## WebSocket

Hubungkan socket setelah login. Aplikasi native dapat mengirim `Authorization: Bearer <token-sesi>` saat membuka koneksi. Browser dapat memakai query `token=<token-sesi>` atau cookie sesi dari origin yang cocok dengan `CORS_ORIGIN` atau `BETTER_AUTH_URL`. Jangan catat URL socket yang memuat token.

| Endpoint      | Contoh penggunaan                                                                  | Event setelah tersambung                                               |
| ------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `/ws/dm`      | `/ws/dm?peerId=user-b` saat membuka chat dengan teman tanpa blokir.                | `connected` dengan `conversationWith`, lalu `direct_message`.          |
| `/ws/channel` | `/ws/channel?channelId=id-channel` saat membuka channel teks di grup yang diikuti. | `connected` dengan `channelId` dan `serverId`, lalu `channel_message`. |
| `/ws/user`    | Buka satu kali setelah login untuk notifikasi dan perubahan akun atau grup.        | `connected` dengan `userId`, lalu event tingkat pengguna.              |

```js
const url = new URL("/ws/dm", wsUrl);
url.searchParams.set("peerId", peerId);
if (sessionToken) url.searchParams.set("token", sessionToken);
const socket = new WebSocket(url);
socket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (event.type === "direct_message") updateMessages(event);
});

// Panggil dari handler input pesan. Berlaku juga untuk socket channel.
function sendTyping() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "typing" }));
    }
}
```

Kirim pesan melalui REST. Socket DM dan channel menerima `{"type":"typing"}` dengan batas satu event per 1,5 detik per socket. Event mengetik diterima di `/ws/user` milik penerima dan berlaku 6 detik. Payload maksimum 16 KiB.

| Event             | Cara membaca atau menanganinya                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `connected`       | Jadikan penanda koneksi berhasil. Field tambahan mengikuti tabel endpoint.                                                                  |
| `direct_message`  | `event` adalah `created`, `updated`, `deleted`, atau `receipt`. Gunakan `senderId`, `recipientId`, dan `message.id` untuk memperbarui chat. |
| `channel_message` | `event` adalah `created`, `updated`, atau `deleted`. Gunakan `serverId`, `channelId`, dan `message.id`.                                     |
| `error`           | Baca field `error` bila server menolak payload klien.                                                                                       |

Event yang diterima melalui `/ws/user`:

| Event               | Field utama dan tindakan                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `notification`      | `notification:{id,kind,title,body,createdAt,...}`. Perbarui daftar dan badge. Riwayat di `GET /api/notifications`.                   |
| `server_event`      | `event`, `serverId`, `actorId`, `createdAt`, dan detail opsional `server`, `channel`, atau `member`. Muat ulang daftar yang berubah. |
| `message_reaction`  | `event` bernilai `added` atau `removed`, disertai `messageId`, `scope`, dan `reactions`. Hitung `me` dari `userIds` jika dibutuhkan. |
| `typing`            | `scope`, `userId`, `peerId` atau `channelId`, dan `expiresAt`. Hapus indikator ketika waktunya habis.                                |
| `presence`          | `userId`, `status`, `lastSeenAt`, `updatedAt`. Perbarui status kontak secara langsung.                                               |
| `read_state`        | `scope`, `userId`, `lastReadMessageId`, `lastReadAt`, dan `markedUnread`. Sinkronkan indikator baca.                                 |
| `poll_event`        | `event` bernilai `created`, `voted`, atau `closed`; gunakan `messageId` dan `poll`.                                                  |
| `pin_event`         | `event` bernilai `pinned` atau `unpinned`; perbarui sematan dengan `scope` dan `messageId`.                                          |
| `scheduled_message` | `event` bernilai `created`, `updated`, `canceled`, `sent`, atau `failed`; gunakan `scheduled.id`.                                    |

Handshake menolak parameter yang hilang dengan `400`, sesi invalid dengan `401`, akses atau origin yang ditolak dengan `403`, dan path tidak dikenal dengan `404`. Jika koneksi terputus, sambungkan ulang dengan jeda bertahap, lalu ambil halaman terbaru melalui REST. Ambil halaman yang lebih lama sampai bertemu ID pesan yang sudah disimpan. Server tidak memutar ulang event yang terlewat. Untuk kode tutup `4003`, periksa akses sebelum mencoba lagi.

## Panggilan pribadi

Panggilan suara dan video DM memakai sesi Ngumpul dan pertemanan aktif. Satu akun hanya bisa ikut satu panggilan pribadi yang sedang berdering atau aktif.

| Endpoint                               | Permintaan dan respons                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/direct-calls`                | `200 {calls}` berisi maksimal 50 panggilan milik akun, dari yang terbaru.                                                                                                                                    |
| `POST /api/direct-calls/peer/:peerId`  | Body `{"kind":"audio"}` atau `{"kind":"video"}`. `201 {call}` berstatus `ringing`. Percobaan ulang untuk panggilan yang masih berdering mengembalikan panggilan yang sama. `409` jika salah satu akun sibuk. |
| `PATCH /api/direct-calls/:callId`      | Body `{"action":"accept"}`, `{"action":"decline"}`, atau `{"action":"end"}`. Penerima hanya dapat menerima atau menolak selama panggilan berdering. Kedua peserta dapat mengakhiri panggilan.                |
| `POST /api/direct-calls/:callId/token` | `200 {url,token,room}` untuk SDK LiveKit. Tersedia bagi peserta dengan akses DM selama panggilan aktif.                                                                                                      |

Tiap `call` berisi `id`, `callerId`, `recipientId`, `kind`, `status`, `createdAt`, `expiresAt`, `answeredAt`, dan `endedAt`. Undangan kedaluwarsa setelah 45 detik dan ditampilkan sebagai `missed`. Perubahan memicu event `{type:"direct_call",callId,status}` di `/ws/user` milik peserta. Muat ulang riwayat saat menerima event atau saat socket tersambung kembali. Ambil token hanya untuk panggilan yang telah diterima. Putuskan koneksi ruang dan hentikan publikasi media saat keluar.

Panggilan memerlukan migrasi tabel `direct_call`, Redis untuk event, dan konfigurasi `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, serta `LIVEKIT_API_SECRET`. Backend memakai `LIVEKIT_URL` untuk menutup ruang bila disetel.

## LiveKit

Gunakan ketiga endpoint berikut untuk channel dengan `kind:"voice"`. Pemanggil harus menjadi anggota grup. Token dari endpoint voice digunakan untuk koneksi LiveKit, sementara token sesi Ngumpul digunakan untuk request HTTP ke API.

| Endpoint                                                                        | Contoh penggunaan                                                                                                                            | Respons dan catatan                                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/servers/:serverId/channels/:channelId/voice-token`                   | Panggil tanpa body saat pengguna menekan **Gabung panggilan**.                                                                               | `200 {url,token,room,expiresInSeconds}`. Token berlaku 1 jam. Berikan `url` dan `token` ke SDK LiveKit.                                                        |
| `GET /api/servers/:serverId/channels/:channelId/voice-participants`             | Tampilkan peserta sebelum bergabung atau pada daftar panggilan.                                                                              | `200 {room,participants}`. Tiap peserta memiliki `identity`, `name`, `username`, `image`, dan status track. Room yang belum dibuka menghasilkan daftar kosong. |
| `PATCH /api/servers/:serverId/channels/:channelId/voice-participants/:identity` | Body `{"muted":true}` untuk mencabut izin publish, `{"muted":false}` untuk memulihkannya, atau `{"remove":true}` untuk mengeluarkan peserta. | `200 {ok,identity,muted,removed}`. Member hanya bisa mengubah izin publish milik sendiri. Owner/admin dapat mengelola peserta lain dan mengeluarkan peserta.   |

Contoh koneksi dari browser dengan paket `livekit-client`:

```js
import { Room, RoomEvent, Track } from "livekit-client";

const response = await fetch(`${apiUrl}/api/servers/${serverId}/channels/${channelId}/voice-token`, {
    method: "POST",
    credentials: "include",
});
if (!response.ok) throw new Error(`Voice token gagal: ${response.status}`);
const { url, token } = await response.json();

const room = new Room();
room.on(RoomEvent.TrackSubscribed, track => {
    if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
        mediaContainer.append(track.attach());
    }
}).on(RoomEvent.TrackUnsubscribed, track => {
    track.detach().forEach(element => element.remove());
});
await room.connect(url, token);
```

Panggil `room.localParticipant.setMicrophoneEnabled(true)`, `setCameraEnabled(true)`, atau `setScreenShareEnabled(true)` dari tombol pengguna. Panggil `room.disconnect()` saat keluar. `url` dari respons harus bisa dijangkau browser. Pada self-hosting, signaling dan port media sama-sama diperlukan. Detail port dan tunnel ada di [panduan Cloudflare](CLOUDFLARE_TUNNEL.md).

`audioMuted` berarti mikrofon tidak aktif atau tidak dipublikasikan. `videoEnabled` dan `screenShareEnabled` mengikuti track kamera dan layar yang aktif. `isPublisher` menunjukkan ada track audio atau video yang dipublikasikan. Endpoint peserta dapat mengembalikan `502` jika LiveKit tidak dapat dijangkau. Ketiga endpoint mengembalikan `503` bila layanan belum dikonfigurasi.

## Penyimpanan S3

Metadata lampiran diurus oleh REST Ngumpul. Isi file dikirim langsung ke storage menggunakan form bertanda tangan. Gunakan `targetType:"direct"` dan ID teman, atau `targetType:"channel"` dan ID channel teks. Pemanggil harus memiliki akses ke tujuan.

| Endpoint                                          | Contoh penggunaan                                                                                                                                | Respons dan catatan                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/attachments/uploads`                   | Body `{"targetType":"direct","targetId":"user-b","fileName":"foto.png","mimeType":"image/png","sizeBytes":12345}`. Pakai ukuran file sebenarnya. | `201 {attachment,upload}`. Simpan `attachment.id`; kirim file ke `upload.url` menggunakan semua `upload.fields`. Izin berlaku 5 menit.         |
| `POST /api/attachments/:attachmentId/complete`    | Setelah POST file ke storage sukses, panggil sebagai pengunggah dengan ID lampiran.                                                              | `200 {attachment}` dengan `id`, `uploadedAt`, dan `previewUrl`. Server memeriksa ukuran, MIME, dan isi file. `409` bila objek belum ditemukan. |
| `GET /api/attachments`                            | Query `?targetType=direct&targetId=user-b` atau gunakan `channel` dan ID channel.                                                                | `200 {attachments}` dengan maksimal 100 lampiran siap pakai.                                                                                   |
| `GET /api/attachments/:attachmentId/download-url` | Ambil URL sebelum membuka atau mengunduh lampiran.                                                                                               | `200 {url,expiresInSeconds}`. URL berlaku 5 menit dan dapat dibuka langsung.                                                                   |
| `GET /api/attachments/:attachmentId/preview`      | **Publik.** Pakai `previewUrl` pada `<img>`, `<video>`, `<audio>`, atau tautan.                                                                  | `302` ke URL bertanda tangan sementara. Siapa pun yang memiliki link preview bisa membukanya.                                                  |
| `DELETE /api/attachments/:attachmentId`           | Pengunggah menghapus lampiran. Untuk lampiran yang sudah dipakai pesan channel, hapus melalui endpoint pesan channel.                            | `204` pada sukses, `404` jika lampiran tidak ditemukan atau bukan milik pemanggil.                                                             |

Upload dari browser setelah memperoleh `upload` dan `attachment` melalui POST pertama:

```js
const form = new FormData();
for (const [key, value] of Object.entries(upload.fields)) form.append(key, value);
form.append("file", file);

const uploaded = await fetch(upload.url, {
    method: "POST",
    body: form,
    credentials: "omit",
});
if (!uploaded.ok) throw new Error(`Upload gagal: ${uploaded.status}`);

const completed = await fetch(`${apiUrl}/api/attachments/${attachment.id}/complete`, {
    method: "POST",
    credentials: "include",
});
if (!completed.ok) throw new Error(`Finalisasi gagal: ${completed.status}`);
```

Biarkan browser mengatur `Content-Type` multipart. Setelah finalisasi berhasil, kirim `{"attachmentId":"id-lampiran"}` melalui endpoint pesan, dengan `text` opsional.

| Jenis file | Batas ukuran | Format                            |
| ---------- | ------------ | --------------------------------- |
| Gambar     | 20 MiB       | JPEG, PNG, WebP, GIF              |
| Video      | 200 MiB      | MP4, WebM, QuickTime              |
| Audio      | 50 MiB       | MPEG, MP4, Ogg, WebM, WAV, M4A    |
| Dokumen    | 50 MiB       | PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX |
| Teks       | 10 MiB       | `text/plain`                      |

## Konfigurasi layanan

| Layanan         | Variabel utama                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server dan sesi | `PORT` (default 3000), `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (minimal 32 karakter), `CORS_ORIGIN`                                                        |
| Data dan event  | `DATABASE_URL` untuk PostgreSQL, `REDIS_URL` untuk event real-time                                                                                         |
| Email OTP       | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`. Compose mendukung override `SMTP_HOST_DOCKER` dan `SMTP_PORT_DOCKER`. |
| Google OAuth    | `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`                                                                                                              |
| LiveKit         | `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`                                                                                              |
| Lampiran        | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_AUTO_CREATE_BUCKET`                         |
| Terjemahan      | `TRANSLATE_API_URL` untuk endpoint yang menerima format LibreTranslate                                                                                     |

Contoh konfigurasi ada di [`.env.example`](.env.example). Cara menjalankan server dan layanan lokal ada di [README](README.md). Route aplikasi didefinisikan di [`src/routes/api.routes.ts`](src/routes/api.routes.ts) dan [`src/routes/server.routes.ts`](src/routes/server.routes.ts). Konfigurasi Better Auth ada di [`src/lib/auth.ts`](src/lib/auth.ts).
