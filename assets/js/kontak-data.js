/* Data kontak bersama untuk seluruh fitur Ngumpul. */
(function () {
    function normalisasiNomorNgumpul(nomor) {
        const x = String(nomor || '').trim().replace(/[\s\-().]/g, '');
        if (/^\+[1-9]\d{7,14}$/.test(x)) return x;
        if (/^00[1-9]\d{7,14}$/.test(x)) return '+' + x.slice(2);
        if (/^08\d{7,13}$/.test(x)) return hpInternasional('62', x);
        if (/^62\d{7,13}$/.test(x)) return '+' + x;
        return null;
    }

    function kunciKontakData(item) {
        let nomor = typeof item === 'string' ? item : item.phone;
        if (typeof item === 'string') {
            const akunLama = getUserById(item);
            nomor = akunLama ? akunLama.hp : item;
        }
        return 'phone:' + (normalisasiNomorNgumpul(nomor) || String(nomor));
    }

    function daftarKontakData(idAkun) {
        try {
            const data = JSON.parse(localStorage.getItem('ngumpul_kontak_' + idAkun) || '[]');
            return Array.isArray(data) ? data.filter(x => x && (typeof x === 'string' || typeof x.phone === 'string')) : [];
        } catch (_) { return []; }
    }

    function simpanDaftarKontakData(idAkun, daftar) {
        try {
            localStorage.setItem('ngumpul_kontak_' + idAkun, JSON.stringify(daftar));
            window.dispatchEvent(new CustomEvent('ngumpul:kontak-berubah', { detail: { idPemilik: idAkun } }));
            return true;
        } catch (_) { return false; }
    }

    function tambahKontakData(idAkun, kontak) {
        const nomor = normalisasiNomorNgumpul(kontak.phone);
        if (!nomor) return false;
        const daftar = daftarKontakData(idAkun);
        const index = daftar.findIndex(item => kunciKontakData(item) === 'phone:' + nomor);
        const item = { phone: nomor, userId: kontak.userId || null, name: kontak.name || nomor };
        if (index >= 0) daftar[index] = item;
        else daftar.push(item);
        return simpanDaftarKontakData(idAkun, daftar);
    }

    function hapusKontakData(idAkun, kunci) {
        const daftar = daftarKontakData(idAkun).filter(item => kunciKontakData(item) !== kunci);
        return simpanDaftarKontakData(idAkun, daftar);
    }

    function cariKontakData(idAkun, kataKunci) {
        const q = String(kataKunci || '').toLowerCase();
        return daftarKontakData(idAkun).filter(item => {
            let nilaiNomor = typeof item === 'string' ? item : item.phone;
            if (typeof item === 'string') {
                const akunLama = getUserById(item);
                if (akunLama) nilaiNomor = akunLama.hp;
            }
            const nomor = normalisasiNomorNgumpul(nilaiNomor) || '';
            const user = getUsers().find(u => samakanHp(u.hp, nomor));
            const profil = user ? getProfil(user.id) : null;
            const nama = ((typeof item === 'string' ? '' : item.name) || (profil && profil.nama) || nomor).toLowerCase();
            return nama.includes(q) || nomor.includes(q);
        });
    }

    window.addEventListener('storage', event => {
        if (event.key === 'ngumpul_users' || (event.key && event.key.indexOf('ngumpul_kontak_') === 0)) {
            window.dispatchEvent(new CustomEvent('ngumpul:kontak-berubah'));
        }
    });

    window.NgumpulKontak = {
        daftar: daftarKontakData, tambah: tambahKontakData, hapus: hapusKontakData,
        cari: cariKontakData, normalisasiNomor: normalisasiNomorNgumpul,
        kunci: kunciKontakData
    };
})();
