document.addEventListener('DOMContentLoaded', () => {
    // 1. Tombol Kembali ke Dashboard Utama
    const btnBack = document.getElementById('btn-back-to-dashboard');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            // Mengarahkan kembali ke file dashboard.html
            window.location.href = '../dashboard/dashboard.html';
        });
    }

    // 2. Event Listener untuk Setiap Row Item Pengaturan Akun
    const accountRows = document.querySelectorAll('.account-row-item');
    
    accountRows.forEach(row => {
        row.addEventListener('click', () => {
            const action = row.getAttribute('data-action');
            handleAccountAction(action);
        });
    });

    // Fungsi Pengatur Aksi Interaksi
    function handleAccountAction(action) {
        switch (action) {
            case 'keamanan':
                alert('Membuka detail Pengaturan Keamanan Akun.');
                break;
            case 'ubah-sandi':
                alert('Mengarahkan ke fitur Ubah Kata Sandi.');
                break;
            case '2fa':
                alert('Membuka konfigurasi Verifikasi Dua Langkah.');
                break;
            case 'perangkat':
                alert('Menampilkan daftar Perangkat Tertaut.');
                break;
            case 'riwayat':
                alert('Menampilkan Riwayat Aktivitas Login.');
                break;
            case 'hapus-akun':
                const konfirmasi = confirm('Apakah Anda yakin ingin menghapus akun secara permanen?');
                if (konfirmasi) {
                    alert('Permintaan hapus akun diproses.');
                }
                break;
            default:
                console.log('Fitur belum dikonfigurasi.');
        }
    }
});