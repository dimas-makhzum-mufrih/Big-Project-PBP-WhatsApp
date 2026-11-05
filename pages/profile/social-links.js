document.addEventListener('DOMContentLoaded', () => {
    // Tombol kembali ke Halaman Profil (Layar 2)
    const btnBackProfile = document.getElementById('btn-back-profile');
    if (btnBackProfile) {
        btnBackProfile.addEventListener('click', () => {
            window.location.href = 'edit-profile.html';
        });
    }

    // Fitur dinamis: Tambahkan kotak input tautan baru saat tombol diklik
    const btnAddSocial = document.getElementById('btn-add-social');
    const container = document.getElementById('social-links-container');

    if (btnAddSocial && container) {
        btnAddSocial.addEventListener('click', () => {
            const platformName = prompt("Masukkan nama platform sosial media (contoh: Twitter / YouTube):");
            if (platformName && platformName.trim() !== "") {
                const newItem = document.createElement('div');
                newItem.className = 'info-row-item social-item';
                newItem.innerHTML = `
                    <span class="account-item-icon">
                        <svg class="ikon"><use href="#i-globe"/></svg>
                    </span>
                    <div class="info-row-text">
                        <span class="field-title">${platformName.trim()}</span>
                        <input type="text" class="social-input-field" placeholder="${platformName.toLowerCase()}.com/username">
                    </div>
                    <svg class="ikon info-arrow"><use href="#i-edit"/></svg>
                `;
                container.appendChild(newItem);
            }
        });
    }
});

const btnBackProfile = document.getElementById('btn-back-profile');
if (btnBackProfile) {
    btnBackProfile.addEventListener('click', () => {
        // Mundur satu tingkat ke halaman Edit Profil
        window.location.href = 'edit-profile.html';
    });
}