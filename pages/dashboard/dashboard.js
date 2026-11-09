// ===== Penjaga: harus login dulu =====
const userAktif = getUserAktif();
if (!userAktif) { location.replace('../auth/login.html'); }

// ===== Elemen utama =====
const triggerMenuUtama = document.getElementById('trigger-menu-utama'),
    boxDropdownUtama = document.getElementById('box-dropdown-utama'),
    optBukaSetelan = document.getElementById('opt-buka-setelan'),
    panelLayerSetelan = document.getElementById('panel-layer-setelan'),
    btnKembaliKeChat = document.getElementById('btn-kembali-ke-chat');

// ===== Menu titik tiga =====
triggerMenuUtama.addEventListener('click', e => {
    e.stopPropagation();
    boxDropdownUtama.style.display = boxDropdownUtama.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', () => { boxDropdownUtama.style.display = 'none'; });

// ===== Panel Pengaturan =====
function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    function bukaSetelan() {
    panelLayerSetelan.style.display = 'flex';
    // untuk layar mobile: panel ada di dalam .sisi-kanan yang disembunyikan CSS
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');
    perbaruiEfekKartuProfil(); // <-- BARIS BARU
}
}
function tutupSetelan() {
    panelLayerSetelan.style.display = 'none';
    document.getElementById('panel-sisi-kiri').classList.remove('room-open');
    document.getElementById('panel-sisi-kanan').classList.remove('room-open');
    // bersihkan hash supaya refresh tidak membuka panel lagi
    history.replaceState(null, '', location.pathname + location.search);
}

optBukaSetelan.addEventListener('click', () => {
    bukaSetelan();
    boxDropdownUtama.style.display = 'none';
});
btnKembaliKeChat.addEventListener('click', tutupSetelan);

// buka otomatis jika datang dari halaman lain dengan #settings
if (location.hash === '#settings') bukaSetelan();

// ===== Keluar akun: hanya menghapus sesi tab ini, data akun tetap aman =====
document.getElementById('btn-keluar-akun').addEventListener('click', () => {
    hapusSesi();
    window.location.href = '../auth/login.html';
});

// ===== Menu "Akun" -> halaman akun =====
const btnMenuAkun = document.querySelector('.settings-row-item[data-fitur="akun"]');
if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';
    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}

// ===== Kartu "Edit Profil" -> halaman edit-profile =====
document.addEventListener('click', (e) => {
    const targetEdit = e.target.closest('[data-fitur="edit-profil"], #btn-buka-edit-profil, .profile-card-trigger');
    if (targetEdit) {
        window.location.href = '../profile/edit-profile.html';
    }
});

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
// ===== Foto profil hasil crop & banner (disimpan di localStorage oleh halaman Edit Profil) =====
const KUNCI_MEDIA = 'ngumpul_media_';
function bacaMedia(idUser) {
    try { return JSON.parse(localStorage.getItem(KUNCI_MEDIA + idUser)) || {}; }
    catch (e) { return {}; }
}

// ===== Isi kartu profil dengan data AKUN YANG SEDANG LOGIN =====
if (userAktif) {
    const profil = getProfil(userAktif.id);
    const kartu = document.getElementById('btn-buka-edit-profil');
    if (kartu) {
        const elemNama = kartu.querySelector('#setting-display-name') || kartu.querySelector('b');
        const elemUsername = kartu.querySelector('#setting-display-username') || kartu.querySelector('.profil-username');
        const elemBio = kartu.querySelector('#setting-display-bio') || kartu.querySelector('.profil-bio');
        
        if (elemNama) elemNama.textContent = profil.nama;
        if (elemUsername) elemUsername.textContent = profil.username;
        if (elemBio) elemBio.textContent = profil.bio || 'Mahasiswa Teknik Informatika';

        // Ambil data gambar (avatar & banner) dari localStorage
        const media = bacaMedia(userAktif.id);
        
        // 1. Render Avatar / Foto Profil di Dashboard
        const imgAvatarOutput = document.getElementById('setting-img-avatar-output');
        const defaultUserIcon = document.getElementById('setting-default-user-icon') || kartu.querySelector('.settings-default-user-icon');
        if (media.avatar && typeof media.avatar === 'string' && media.avatar.startsWith('data:image/')) {
            if (imgAvatarOutput) {
                imgAvatarOutput.src = media.avatar;
                imgAvatarOutput.style.display = 'block';
            }
            if (defaultUserIcon) {
                defaultUserIcon.style.display = 'none';
            }
        }

        // 2. Render Banner di Dashboard
        const bannerPreview = document.getElementById('setting-banner-preview');
        if (media.banner && typeof media.banner === 'string' && media.banner.startsWith('data:image/')) {
            if (bannerPreview) {
                bannerPreview.style.backgroundImage = 'url("' + media.banner + '")';
                bannerPreview.style.backgroundSize = 'cover';
                bannerPreview.style.backgroundPosition = 'center';
            }
        }
    }

    // isi menu ganti akun
    const mNama = document.getElementById('akun-menu-nama');
    const mUser = document.getElementById('akun-menu-username');
    if (mNama) mNama.textContent = profil.nama;
    if (mUser) mUser.textContent = profil.username;
}

// kartu juga bisa dibuka lewat keyboard (Enter / Spasi)
const kartuProfil = document.getElementById('btn-buka-edit-profil');
if (kartuProfil) {
    kartuProfil.addEventListener('keydown', (e) => {
        if (e.target !== kartuProfil) return; // abaikan tombol di dalam kartu (panah v)
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = '../profile/edit-profile.html';
        }
    });
}

// Buang draft Edit Profil yang belum disimpan
try { sessionStorage.removeItem('draft_profil_edit'); } catch (e) {}


// ===== Panah (v) di kartu profil: menu ganti akun =====
const btnGantiAkun = document.getElementById('btn-ganti-akun');
const menuGantiAkun = document.getElementById('menu-ganti-akun');

function tutupMenuGantiAkun() {
    if (!menuGantiAkun) return;
    menuGantiAkun.hidden = true;
    if (btnGantiAkun) btnGantiAkun.setAttribute('aria-expanded', 'false');
}
if (btnGantiAkun && menuGantiAkun) {
    btnGantiAkun.addEventListener('click', (e) => {
        e.stopPropagation(); // jangan ikut membuka halaman Edit Profil
        const buka = menuGantiAkun.hidden;
        menuGantiAkun.hidden = !buka;
        btnGantiAkun.setAttribute('aria-expanded', String(buka));
    });
    // klik di luar menu = tutup
    document.addEventListener('click', (e) => {
        if (!menuGantiAkun.contains(e.target)) tutupMenuGantiAkun();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') tutupMenuGantiAkun();
    });
    // beralih akun: akhiri sesi tab ini lalu masuk dengan akun lain
    document.getElementById('btn-masuk-akun-lain').addEventListener('click', () => {
        hapusSesi();
        window.location.href = '../auth/login.html';
    });
}


// ===== Efek scroll KHUSUS kartu profil =====
// Kartu ada di paling atas daftar pengaturan: saat digulir ke bawah ia memudar & hilang,
// saat digulir ke atas muncul lagi. Menu pengaturan di bawahnya tidak disentuh.
function perbaruiEfekKartuProfil() {
    const profilAtas = document.getElementById('profil-atas');
    const daftar = document.querySelector('.settings-list-flow');
    if (!profilAtas || !daftar) return;
    const tinggi = profilAtas.offsetHeight || 1;
    const p = Math.min(Math.max(daftar.scrollTop / tinggi, 0), 1); // 0 = terlihat, 1 = hilang
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        profilAtas.style.opacity = p >= 1 ? '0' : '1';
        profilAtas.style.transform = '';
    } else {
        profilAtas.style.opacity = String(1 - p);
        profilAtas.style.transform = 'scale(' + (1 - 0.05 * p) + ')';
    }
    profilAtas.style.pointerEvents = p >= 0.9 ? 'none' : '';
    if (p >= 0.9) tutupMenuGantiAkun();
}

let sedangMenjadwalkan = false;
const daftarSetelanScroll = document.querySelector('.settings-list-flow');
if (daftarSetelanScroll) {
    daftarSetelanScroll.addEventListener('scroll', () => {
        if (sedangMenjadwalkan) return;
        sedangMenjadwalkan = true;
        requestAnimationFrame(() => {
            sedangMenjadwalkan = false;
            perbaruiEfekKartuProfil();
        });
    }, { passive: true });
}

// =====================================================================
//  FITUR: Sistem Chat + Emoji Picker + Message Reaction
// =====================================================================

// ===== Data Emoji per Kategori =====
const DATA_EMOJI = {
    smileys: {
        label: 'Wajah & Emosi',
        list: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🫶']
    },
    gestures: {
        label: 'Tangan & Isyarat',
        list: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦']
    },
    people: {
        label: 'Orang',
        list: ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🫃','🫄','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','🧌','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','🕴️','👯','🧖','🧗','🤸','⛹️','🏋️','🚴','🚵','🤼','🤽','🤾','🤺','⛷️','🏂','🏌️','🏇','🏄','🚣','🏊','🤿','🧘']
    },
    animals: {
        label: 'Hewan & Alam',
        list: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦂','🦟','🦗','🕷️','🕸️','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🪸','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎','🌍','🌏','🪐','💫','⭐','🌟','✨','⚡','☄️','💥','🔥','🌪️','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','💧','💦','🫧','☔','☂️','🌊','🌫️']
    },
    food: {
        label: 'Makanan & Minuman',
        list: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🫙','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥣','🥡','🥢','🧂']
    },
    travel: {
        label: 'Perjalanan & Tempat',
        list: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','🛞','⛽','🛞','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🛖','⛲','⛺','🏕️','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','♨️','🗼','🗽','🏰','🏯','🗺️','🎠','🎡','🎢','💈','🎪','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚃']
    },
    activities: {
        label: 'Aktivitas',
        list: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚴','🚵','🎖️','🏆','🥇','🥈','🥉','🏅','🎗️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🧩']
    },
    objects: {
        label: 'Objek',
        list: ['💡','🔦','🕯️','🪔','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','🧮','🎥','📸','📹','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💰','🪙','💴','💵','💶','💷','🏧','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🧳','🌂','☂️','🧵','🪡','🧶','👓','🕶️','🥽','🧤','🧣','🧥','🧦','👔','👕','👖','🧱','👗','👘','🥻','🩱','🩲','🩳','👙','👚','👛','👜','👝','🛍️','🎒','🩴','👞','👟','🥾','🥿','👠','👡','🩰','👢','👑','👒','🎩','🎓','🧢','🪖','⛑️','💄','💍','💼','📦','📫','📪','📬','📭','📮','🗳️','✏️','✒️','🖋️','🖊️','🖌️','🖍️','📝','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️']
    },
    symbols: {
        label: 'Simbol',
        list: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','🪯','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚻','🚼','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','🟰','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛']
    },
    flags: {
        label: 'Bendera',
        list: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇦🇨','🇦🇩','🇦🇪','🇦🇫','🇦🇬','🇦🇮','🇦🇱','🇦🇲','🇦🇴','🇦🇶','🇦🇷','🇦🇸','🇦🇹','🇦🇺','🇦🇼','🇦🇽','🇦🇿','🇧🇦','🇧🇧','🇧🇩','🇧🇪','🇧🇫','🇧🇬','🇧🇭','🇧🇮','🇧🇯','🇧🇱','🇧🇲','🇧🇳','🇧🇴','🇧🇶','🇧🇷','🇧🇸','🇧🇹','🇧🇻','🇧🇼','🇧🇾','🇧🇿','🇨🇦','🇨🇨','🇨🇩','🇨🇫','🇨🇬','🇨🇭','🇨🇮','🇨🇰','🇨🇱','🇨🇲','🇨🇳','🇨🇴','🇨🇵','🇨🇷','🇨🇺','🇨🇻','🇨🇼','🇨🇽','🇨🇾','🇨🇿','🇩🇪','🇩🇬','🇩🇯','🇩🇰','🇩🇲','🇩🇴','🇩🇿','🇪🇦','🇪🇨','🇪🇪','🇪🇬','🇪🇭','🇪🇷','🇪🇸','🇪🇹','🇪🇺','🇫🇮','🇫🇯','🇫🇰','🇫🇲','🇫🇴','🇫🇷','🇬🇦','🇬🇧','🇬🇩','🇬🇪','🇬🇫','🇬🇬','🇬🇭','🇬🇮','🇬🇱','🇬🇲','🇬🇳','🇬🇵','🇬🇶','🇬🇷','🇬🇸','🇬🇹','🇬🇺','🇬🇼','🇬🇾','🇭🇰','🇭🇲','🇭🇳','🇭🇷','🇭🇹','🇭🇺','🇮🇨','🇮🇩','🇮🇪','🇮🇱','🇮🇲','🇮🇳','🇮🇴','🇮🇶','🇮🇷','🇮🇸','🇮🇹','🇯🇪','🇯🇲','🇯🇴','🇯🇵','🇰🇪','🇰🇬','🇰🇭','🇰🇮','🇰🇲','🇰🇳','🇰🇵','🇰🇷','🇰🇼','🇰🇾','🇰🇿','🇱🇦','🇱🇧','🇱🇨','🇱🇮','🇱🇰','🇱🇷','🇱🇸','🇱🇹','🇱🇺','🇱🇻','🇱🇾','🇲🇦','🇲🇨','🇲🇩','🇲🇪','🇲🇫','🇲🇬','🇲🇭','🇲🇰','🇲🇱','🇲🇲','🇲🇳','🇲🇴','🇲🇵','🇲🇶','🇲🇷','🇲🇸','🇲🇹','🇲🇺','🇲🇻','🇲🇼','🇲🇽','🇲🇾','🇲🇿']
    }
};

// ===== Data Chat & Reaction (localStorage) =====
const KEY_PESAN = 'ngumpul_pesan';
const KEY_REAKSI = 'ngumpul_reaksi';

function getPesan() {
    try { return JSON.parse(localStorage.getItem(KEY_PESAN)) || {}; } catch(e) { return {}; }
}
function simpanPesan(data) {
    try { localStorage.setItem(KEY_PESAN, JSON.stringify(data)); } catch(e) {}
}
function getReaksi() {
    try { return JSON.parse(localStorage.getItem(KEY_REAKSI)) || {}; } catch(e) { return {}; }
}
function simpanReaksi(data) {
    try { localStorage.setItem(KEY_REAKSI, JSON.stringify(data)); } catch(e) {}
}

// ===== Daftar Kontak Dummy =====
const KONTAK_DUMMY = [
    { id: 'kontak_1', nama: 'Budi Santoso',   warna: '#3984bd' },
    { id: 'kontak_2', nama: 'Siti Rahayu',    warna: '#e5484d' },
    { id: 'kontak_3', nama: 'Ahmad Fauzi',    warna: '#0e7490' },
    { id: 'kontak_4', nama: 'Dewi Lestari',   warna: '#8b5cf6' },
    { id: 'kontak_5', nama: 'Rizky Pratama',  warna: '#ea580c' },
];

const BALASAN_OTOMATIS = [
    'Halo juga! 👋',
    'Oke, siap! 👍',
    'Wah keren banget 🔥',
    'Haha iya bener 😂',
    'Makasih ya! 🙏',
    'Nanti aku kabarin lagi ya',
    'Sip, sudah dicatat 📝',
    'Setuju! 💯',
    'Iya, betul sekali 😊',
    'Mantap! 🎉',
];

// ===== Render Daftar Chat Kiri =====
let kontakAktifId = null;
const boxListPesan = document.getElementById('box-list-pesan');
const chatScrollArea = document.querySelector('.chat-scroll-area');
const panelChatKosong = document.getElementById('panel-chat-kosong');
const panelChatAktif = document.getElementById('panel-chat-aktif');
const namaHeaderKanan = document.getElementById('nama-header-kanan');
const avatarHeaderKanan = document.getElementById('avatar-header-kanan');
const inputTeksKirim = document.getElementById('input-teks-kirim');
const btnKirimPesan = document.getElementById('btn-kirim-pesan');

function renderDaftarChat() {
    if (!chatScrollArea) return;
    chatScrollArea.innerHTML = '';
    const semuaPesan = getPesan();

    KONTAK_DUMMY.forEach(kontak => {
        const pesanChat = semuaPesan[kontak.id] || [];
        const pesanTerakhir = pesanChat.length > 0 ? pesanChat[pesanChat.length - 1] : null;

        const card = document.createElement('div');
        card.className = 'chat-card' + (kontakAktifId === kontak.id ? ' aktif' : '');
        card.innerHTML = `
            <div class="circle-avatar" style="background:${kontak.warna}">${kontak.nama.charAt(0)}</div>
            <div class="card-meta">
                <div class="card-top">
                    <span class="card-title">${kontak.nama}</span>
                    <small style="color:var(--teks-redup);font-size:.75rem">${pesanTerakhir ? pesanTerakhir.waktu : ''}</small>
                </div>
                <p class="card-preview">${pesanTerakhir ? pesanTerakhir.teks : 'Ketuk untuk mulai chat'}</p>
            </div>
        `;
        card.addEventListener('click', () => bukaChat(kontak));
        chatScrollArea.appendChild(card);
    });
}

function bukaChat(kontak) {
    kontakAktifId = kontak.id;
    panelChatKosong.style.display = 'none';
    panelChatAktif.style.display = 'flex';
    namaHeaderKanan.textContent = kontak.nama;
    avatarHeaderKanan.textContent = kontak.nama.charAt(0);
    avatarHeaderKanan.style.background = kontak.warna;

    // mobile
    document.getElementById('panel-sisi-kiri').classList.add('room-open');
    document.getElementById('panel-sisi-kanan').classList.add('room-open');

    renderPesan();
    renderDaftarChat();
    inputTeksKirim.focus();
}

// ===== Render Pesan di Ruang Chat =====
function buatWaktu() {
    const d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

function renderPesan() {
    if (!kontakAktifId || !boxListPesan) return;
    boxListPesan.innerHTML = '';
    const semuaPesan = getPesan();
    const daftarPesan = semuaPesan[kontakAktifId] || [];
    const semuaReaksi = getReaksi();

    daftarPesan.forEach((pesan, idx) => {
        const msgId = kontakAktifId + '_' + idx;
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-bubble-wrapper ' + pesan.arah;
        wrapper.dataset.msgId = msgId;

        // Bubble isi pesan
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + pesan.arah;
        bubble.innerHTML = `<span>${escapeHtml(pesan.teks)}</span><span class="timestamp">${pesan.waktu}</span>`;

        // Tombol react (emoji smiley kecil)
        const btnReact = document.createElement('button');
        btnReact.className = 'btn-react-trigger';
        btnReact.type = 'button';
        btnReact.textContent = '😊';
        btnReact.title = 'Beri reaksi';
        btnReact.addEventListener('click', (e) => {
            e.stopPropagation();
            tampilkanReactionPicker(wrapper, msgId);
        });

        wrapper.appendChild(bubble);
        wrapper.appendChild(btnReact);

        // Reaction bar
        const reaksiMsg = semuaReaksi[msgId] || {};
        if (Object.keys(reaksiMsg).length > 0) {
            const bar = buatReactionBar(reaksiMsg, msgId);
            wrapper.appendChild(bar);
        }

        boxListPesan.appendChild(wrapper);
    });

    boxListPesan.scrollTop = boxListPesan.scrollHeight;
}

function escapeHtml(teks) {
    const div = document.createElement('div');
    div.textContent = teks;
    return div.innerHTML;
}

// ===== Kirim Pesan =====
function kirimPesan() {
    if (!kontakAktifId) return;
    const teks = inputTeksKirim.value.trim();
    if (!teks) return;

    const semuaPesan = getPesan();
    if (!semuaPesan[kontakAktifId]) semuaPesan[kontakAktifId] = [];
    semuaPesan[kontakAktifId].push({ arah: 'kirim', teks, waktu: buatWaktu() });
    simpanPesan(semuaPesan);

    inputTeksKirim.value = '';
    renderPesan();
    renderDaftarChat();

    // Balasan otomatis setelah 1-2 detik
    setTimeout(() => {
        const balasan = BALASAN_OTOMATIS[Math.floor(Math.random() * BALASAN_OTOMATIS.length)];
        const data = getPesan();
        if (!data[kontakAktifId]) data[kontakAktifId] = [];
        data[kontakAktifId].push({ arah: 'terima', teks: balasan, waktu: buatWaktu() });
        simpanPesan(data);
        renderPesan();
        renderDaftarChat();
    }, 1000 + Math.random() * 1500);
}

btnKirimPesan.addEventListener('click', kirimPesan);
inputTeksKirim.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirimPesan(); }
});

// ===== EMOJI PICKER =====
const btnEmojiToggle = document.getElementById('btn-emoji-toggle');
const emojiPickerPopup = document.getElementById('emoji-picker-popup');
const emojiGrid = document.getElementById('emoji-grid');
const emojiSearchInput = document.getElementById('emoji-search-input');
const emojiTabs = document.getElementById('emoji-tabs');
const emojiKategoriLabel = document.getElementById('emoji-kategori-label');

let kategoriAktif = 'smileys';

function aturStatusEmojiPicker(terbuka) {
    emojiPickerPopup.style.display = terbuka ? 'flex' : 'none';
    btnEmojiToggle.classList.toggle('panel-terbuka', terbuka);
    btnEmojiToggle.setAttribute('aria-label', terbuka ? 'Tutup panel emoji' : 'Pilih emoji');
    btnEmojiToggle.title = terbuka ? 'Tutup panel emoji' : 'Emoji';
}

function renderEmojiGrid(filter) {
    emojiGrid.innerHTML = '';
    const data = DATA_EMOJI[kategoriAktif];
    if (!data) return;

    const list = filter
        ? data.list.filter(e => e.includes(filter))
        : data.list;

    list.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = emoji;
        btn.title = emoji;
        btn.addEventListener('click', () => {
            window.sisipkanEmoji(emoji);
        });
        emojiGrid.appendChild(btn);
    });

    // Kalau ada filter, cari juga di semua kategori
    if (filter) {
        Object.keys(DATA_EMOJI).forEach(kat => {
            if (kat === kategoriAktif) return;
            DATA_EMOJI[kat].list.forEach(emoji => {
                if (emoji.includes(filter)) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = emoji;
                    btn.title = emoji;
                    btn.addEventListener('click', () => window.sisipkanEmoji(emoji));
                    emojiGrid.appendChild(btn);
                }
            });
        });
    }
}

function sisipkanEmoji(emoji) {
    inputTeksKirim.value += emoji;
    inputTeksKirim.focus();
}

// Toggle emoji picker
btnEmojiToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = emojiPickerPopup.style.display !== 'none';
    if (isOpen) {
        tutupEmojiPicker();
    } else {
        aturStatusEmojiPicker(true);
        emojiSearchInput.value = '';
        renderEmojiGrid();
        emojiSearchInput.focus();
    }
});

function tutupEmojiPicker() {
    aturStatusEmojiPicker(false);
}

// Tab navigasi
emojiTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.emoji-tab');
    if (!tab) return;
    emojiTabs.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('aktif'));
    tab.classList.add('aktif');
    kategoriAktif = tab.dataset.kategori;
    emojiKategoriLabel.textContent = DATA_EMOJI[kategoriAktif]?.label || '';
    emojiSearchInput.value = '';
    renderEmojiGrid();
});

// Pencarian emoji
emojiSearchInput.addEventListener('input', () => {
    renderEmojiGrid(emojiSearchInput.value.trim());
});

// Tutup emoji picker kalau klik di luar
document.addEventListener('click', (e) => {
    if (!emojiPickerPopup.contains(e.target) && e.target !== btnEmojiToggle) {
        tutupEmojiPicker();
    }
});

// ===== MESSAGE REACTION =====
const reactionPickerPopup = document.getElementById('reaction-picker-popup');
let reactionTargetMsgId = null;
let reactionTargetWrapper = null;

function tampilkanReactionPicker(wrapper, msgId) {
    reactionTargetMsgId = msgId;
    reactionTargetWrapper = wrapper;

    // Posisikan popup di atas bubble
    const bubble = wrapper.querySelector('.chat-bubble');
    const rect = bubble.getBoundingClientRect();
    const container = panelChatAktif.getBoundingClientRect();

    reactionPickerPopup.style.display = 'flex';

    // Hitung posisi (di atas bubble, tengah)
    const popupW = reactionPickerPopup.offsetWidth;
    let left = rect.left - container.left + (rect.width / 2) - (popupW / 2);
    let top = rect.top - container.top - 48;

    // Jaga agar tidak keluar layar
    if (left < 8) left = 8;
    if (left + popupW > container.width - 8) left = container.width - popupW - 8;
    if (top < 8) top = rect.bottom - container.top + 8;

    reactionPickerPopup.style.left = left + 'px';
    reactionPickerPopup.style.top = top + 'px';
}

function tutupReactionPicker() {
    reactionPickerPopup.style.display = 'none';
    reactionTargetMsgId = null;
    reactionTargetWrapper = null;
}

// Klik quick reaction
reactionPickerPopup.querySelectorAll('.reaction-quick:not(.reaction-more)').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!reactionTargetMsgId) return;
        toggleReaction(reactionTargetMsgId, btn.dataset.emoji);
        tutupReactionPicker();
    });
});

// Tombol "+" untuk buka emoji picker khusus reaction
const btnReactionMore = document.getElementById('btn-reaction-more');
btnReactionMore.addEventListener('click', (e) => {
    e.stopPropagation();
    // Buka modal reaction emoji picker
    bukaReactionEmojiPicker();
});

function bukaReactionEmojiPicker() {
    // Gunakan emoji picker yang sama, tapi mode reaction
    window._modeReaction = true;
    aturStatusEmojiPicker(true);
    emojiSearchInput.value = '';
    renderEmojiGrid();
    emojiSearchInput.focus();

    // Override posisi picker: taruh di tengah layar
    emojiPickerPopup.style.position = 'fixed';
    emojiPickerPopup.style.bottom = '50%';
    emojiPickerPopup.style.left = '50%';
    emojiPickerPopup.style.transform = 'translate(-50%, 50%)';

    const tutupHandler = () => {
        window._modeReaction = false;
        emojiPickerPopup.style.position = '';
        emojiPickerPopup.style.bottom = '';
        emojiPickerPopup.style.left = '';
        emojiPickerPopup.style.transform = '';
        // Kembalikan handler sisipkan emoji default
    };

    // Ganti sementara handler klik emoji grid
    const origHandler = sisipkanEmoji;
    window._origSisipEmoji = origHandler;
    window._tutupReactionPicker = tutupHandler;
}

// Override sisipkanEmoji ketika mode reaction
const _sisipkanEmojiAsli = sisipkanEmoji;
function sisipkanEmojiOverride(emoji) {
    if (window._modeReaction && reactionTargetMsgId) {
        toggleReaction(reactionTargetMsgId, emoji);
        tutupEmojiPicker();
        tutupReactionPicker();
        window._modeReaction = false;
        if (window._tutupReactionPicker) window._tutupReactionPicker();
    }
}

// Patch emoji grid click
const origRenderEmojiGrid = renderEmojiGrid;
// Override the emoji insertion function
const origSisipkanEmoji = sisipkanEmoji;

// Re-define sisipkanEmoji to handle reaction mode
window.sisipkanEmoji = function(emoji) {
    if (window._modeReaction && reactionTargetMsgId) {
        toggleReaction(reactionTargetMsgId, emoji);
        tutupEmojiPicker();
        tutupReactionPicker();
        window._modeReaction = false;
        if (window._tutupReactionPicker) window._tutupReactionPicker();
        return;
    }
    inputTeksKirim.value += emoji;
    inputTeksKirim.focus();
};

// ===== Reaction Storage & Rendering =====
function toggleReaction(msgId, emoji) {
    const userId = userAktif ? userAktif.id : 'saya';
    const semuaReaksi = getReaksi();
    if (!semuaReaksi[msgId]) semuaReaksi[msgId] = {};
    if (!semuaReaksi[msgId][emoji]) semuaReaksi[msgId][emoji] = [];

    const idx = semuaReaksi[msgId][emoji].indexOf(userId);
    if (idx >= 0) {
        // Hapus reaction
        semuaReaksi[msgId][emoji].splice(idx, 1);
        if (semuaReaksi[msgId][emoji].length === 0) {
            delete semuaReaksi[msgId][emoji];
        }
    } else {
        // Tambah reaction
        semuaReaksi[msgId][emoji].push(userId);
    }

    if (Object.keys(semuaReaksi[msgId]).length === 0) {
        delete semuaReaksi[msgId];
    }

    simpanReaksi(semuaReaksi);
    renderPesan();
}

function buatReactionBar(reaksiObj, msgId) {
    const userId = userAktif ? userAktif.id : 'saya';
    const bar = document.createElement('div');
    bar.className = 'reaction-bar';

    Object.entries(reaksiObj).forEach(([emoji, users]) => {
        const badge = document.createElement('button');
        badge.className = 'reaction-badge' + (users.includes(userId) ? ' mine' : '');
        badge.type = 'button';
        badge.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">${users.length}</span>`;
        badge.title = users.includes(userId) ? 'Klik untuk menghapus reaksi' : 'Klik untuk memberi reaksi';
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaction(msgId, emoji);
        });
        bar.appendChild(badge);
    });

    return bar;
}

// Tutup reaction picker kalau klik di luar
document.addEventListener('click', (e) => {
    if (!reactionPickerPopup.contains(e.target) && !e.target.closest('.btn-react-trigger')) {
        tutupReactionPicker();
    }
});

// Tutup reaction picker saat tekan Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        tutupReactionPicker();
        tutupEmojiPicker();
        if (window._modeReaction) {
            window._modeReaction = false;
            if (window._tutupReactionPicker) window._tutupReactionPicker();
        }
    }
});

// ===== Tombol kembali di header chat (mobile) =====
const headerChatKanan = document.querySelector('.active-chat-header');
if (headerChatKanan) {
    headerChatKanan.style.cursor = 'pointer';
    headerChatKanan.addEventListener('click', () => {
        if (window.innerWidth <= 700) {
            panelChatAktif.style.display = 'none';
            panelChatKosong.style.display = 'flex';
            document.getElementById('panel-sisi-kiri').classList.remove('room-open');
            document.getElementById('panel-sisi-kanan').classList.remove('room-open');
            kontakAktifId = null;
            renderDaftarChat();
        }
    });
}

// ===== Inisialisasi =====
renderDaftarChat();
