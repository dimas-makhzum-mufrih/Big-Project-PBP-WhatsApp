const NgumpulTeman = (() => {
    let teman = new Map();

    function nama(orang) {
        const namaUsername = String(orang.username || '').replace(/^@/, '').toLocaleLowerCase();
        for (const candidate of [orang.displayName, orang.name]) {
            const nilai = typeof candidate === 'string' ? candidate.trim() : '';
            if (nilai && nilai.replace(/^@/, '').toLocaleLowerCase() !== namaUsername) return nilai;
        }
        return username(orang) || 'Pengguna Ngumpul';
    }

    function punyaNamaTerpisah(orang) {
        const tampil = nama(orang).replace(/^@/, '').toLocaleLowerCase();
        const namaUsername = String(orang.username || '').replace(/^@/, '').toLocaleLowerCase();
        return !!namaUsername && tampil !== namaUsername;
    }

    function username(orang) {
        return orang.username ? '@' + orang.username : '';
    }

    function foto(orang) {
        return NgumpulAvatar.url(orang.avatar);
    }

    function jumlahBelumDibaca(orang) {
        const count = Number(orang?.unreadCount);
        return Number.isFinite(count) ? Math.max(0, count) : 0;
    }

    async function muat() {
        const { friends } = await NgumpulAuth.api('friends');
        const data = new Map(friends.map(orang => [orang.userId, orang]));
        const daftarBerubah = data.size !== teman.size ||
            friends.some(orang => JSON.stringify(orang) !== JSON.stringify(teman.get(orang.userId)));
        teman = data;
        if (daftarBerubah) document.dispatchEvent(new Event('ngumpul:teman-berubah'));
    }

    return {
        muat, nama, punyaNamaTerpisah, username, foto, jumlahBelumDibaca,
        get: id => teman.get(id),
        list: () => Array.from(teman.values())
    };
})();
