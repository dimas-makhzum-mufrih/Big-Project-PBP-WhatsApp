// Fitur polling: dialog buat polling dengan pilihan diketik sendiri (maks 10).
// Dipanggil dari chatku.html: pollDlg((pertanyaan, daftarPilihan) => ...)
function pollDlg(cb){
 const d=$('#dlg');d.className='on';
 const optRow=i=>`<div class='por' style='display:flex;gap:6px;align-items:center;margin-top:6px'><input class='poi' placeholder='Ketik pilihan ${i}' style='flex:1'>${i>2?`<button class='x pox' title='Hapus pilihan'>✕</button>`:''}</div>`;
 d.innerHTML=`<div class='box'><h3>Buat polling</h3><label>Pertanyaan</label><input id='pq' placeholder='contoh: Belajar bareng kapan?'><label>Pilihan jawaban (ketik sendiri satu per satu)</label><div id='pos'>${optRow(1)}${optRow(2)}</div><button id='pad' class='lnk' style='width:100%;margin-top:10px'>+ Tambah pilihan</button><div class='act'><button id='dn'>Batal</button><button id='dy' class='join'>Kirim</button></div></div>`;
 const pos=$('#pos');
 const renum=()=>{[...pos.children].forEach((r,i)=>{r.querySelector('.poi').placeholder='Ketik pilihan '+(i+1)});$('#pad').style.display=pos.children.length>=10?'none':''};
 $('#pad').onclick=()=>{if(pos.children.length>=10)return;pos.insertAdjacentHTML('beforeend',optRow(pos.children.length+1));pos.lastElementChild.querySelector('.poi').focus();renum()};
 pos.onclick=e=>{const b=e.target.closest('.pox');if(b){b.closest('.por').remove();renum()}};
 $('#dn').onclick=()=>d.className='';
 $('#dy').onclick=()=>{const q=$('#pq').value.trim(),o=[...pos.querySelectorAll('.poi')].map(i=>i.value.trim()).filter(Boolean);
  if(!q){toast('Isi pertanyaan dulu');return}if(o.length<2){toast('Isi minimal 2 pilihan');return}
  d.className='';cb(q,o)};
 $('#pq').focus();
}
