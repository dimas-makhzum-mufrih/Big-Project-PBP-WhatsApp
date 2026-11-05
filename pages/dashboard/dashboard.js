const triggerMenuUtama=document.getElementById('trigger-menu-utama'),
boxDropdownUtama=document.getElementById('box-dropdown-utama'),
optBukaSetelan=document.getElementById('opt-buka-setelan'),
panelLayerSetelan=document.getElementById('panel-layer-setelan'),
btnKembaliKeChat=document.getElementById('btn-kembali-ke-chat');

triggerMenuUtama.addEventListener('click',e=>{e.stopPropagation();boxDropdownUtama.style.display=boxDropdownUtama.style.display==='none'?'block':'none'});
document.addEventListener('click',()=>{boxDropdownUtama.style.display='none'});
optBukaSetelan.addEventListener('click',()=>{panelLayerSetelan.style.display='flex';boxDropdownUtama.style.display='none'});
btnKembaliKeChat.addEventListener('click',()=>{panelLayerSetelan.style.display='none'});

document.getElementById('btn-keluar-akun').addEventListener('click',()=>{
    try{localStorage.clear();sessionStorage.clear()}catch(e){}
    window.location.href='../../index.html?splash=none';
});

const btnMenuAkun = document.querySelector('.settings-row-item[data-fitur="akun"]');
if (btnMenuAkun) {
    btnMenuAkun.style.cursor = 'pointer';
    btnMenuAkun.addEventListener('click', () => {
        window.location.href = '../account/account.html';
    });
}