(function (global) {
    const KEY_KONTAK = 'ngumpul_kontak_';

    function nomorKanonik(nomor) {
        const digits = String(nomor || '').replace(/\D/g, '');
        if (!digits) return '';
        return '+' + digits;
    }

    function baca(userId) {
        let data;
        try {
            data = localStorage.getItem(KEY_KONTAK + userId);
        } catch (error) {
            throw new Error('Daftar kontak tidak dapat dibaca dari penyimpanan lokal.');
        }
        if (!data) return [];

        let daftar;
        try {
            daftar = JSON.parse(data);
        } catch (error) {
            throw new Error('Format daftar kontak tidak valid.');
        }
        if (!Array.isArray(daftar)) throw new Error('Format daftar kontak tidak valid.');

        const hasil = new Map();
        daftar.forEach(item => {
            if (typeof item === 'string') {
                const user = getUserById(item);
                if (user && user.hp) {
                    const phone = nomorKanonik(user.hp);
                    hasil.set(phone, { phone: phone, name: user.nama || '' });
                }
                return;
            }
            if (!item || typeof item.phone !== 'string') return;
            const phone = nomorKanonik(item.phone);
            if (phone) hasil.set(phone, { phone: phone, name: typeof item.name === 'string' ? item.name : '' });
        });
        return Array.from(hasil.values());
    }

    function simpan(userId, daftar) {
        try {
            localStorage.setItem(KEY_KONTAK + userId, JSON.stringify(daftar));
        } catch (error) {
            throw new Error('Kontak gagal disimpan. Periksa ruang penyimpanan browser.');
        }
    }

    function getAll(userId) {
        return baca(userId);
    }

    function add(userId, phone, name) {
        const normalizedPhone = nomorKanonik(phone);
        if (!normalizedPhone) throw new Error('Nomor HP kontak tidak valid.');
        const daftar = baca(userId);
        const index = daftar.findIndex(item => item.phone === normalizedPhone);
        const contact = { phone: normalizedPhone, name: String(name || '').trim() };
        const updated = index !== -1;
        if (updated) daftar[index] = contact;
        else daftar.push(contact);
        simpan(userId, daftar);
        return { contact: contact, updated: updated };
    }

    function remove(userId, phone) {
        const normalizedPhone = nomorKanonik(phone);
        const daftar = baca(userId);
        const hasil = daftar.filter(item => item.phone !== normalizedPhone);
        if (hasil.length === daftar.length) return false;
        simpan(userId, hasil);
        return true;
    }

    function search(userId, query) {
        const kataKunci = String(query || '').trim().toLowerCase();
        return baca(userId).filter(item =>
            item.name.toLowerCase().includes(kataKunci) ||
            item.phone.toLowerCase().includes(kataKunci)
        );
    }

    function isContactsStorageKey(userId, key) {
        return key === KEY_KONTAK + userId;
    }

    global.NgumpulKontakData = {
        list: getAll,
        getAll: getAll,
        add: add,
        remove: remove,
        search: search,
        isContactsStorageKey: isContactsStorageKey
    };
})(window);
