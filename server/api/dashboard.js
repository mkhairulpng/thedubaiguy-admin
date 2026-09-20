const fs=require('fs');const path=require('path');const {isAdmin}=require('./auth/_auth');

function injectPOSInventoryLink(html){
  const patch=String.raw`
<style id="tdg-pos-inventory-link-style">
.tdg-pos-select{display:flex;flex-direction:column;align-items:stretch;gap:5px;overflow:hidden}
.tdg-pos-thumb{width:100%;height:145px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:3px}
.tdg-pos-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.tdg-pos-thumb span{font-size:10px;color:var(--muted)}
.tdg-pos-select:disabled{opacity:.48;cursor:not-allowed}
@media(max-width:1000px){.tdg-pos-thumb{height:130px}}
@media(max-width:600px){.tdg-pos-thumb{height:180px}}
</style>
<script>
(function(){
  function patchPOS(){
    if(typeof window.tdgRenderPOS!=='function'||typeof window.tdgAddPOS!=='function')return;

    window.tdgRenderPOS=async function(){
      const box=$('tdgPOSProducts');if(!box)return;
      try{
        const d=await tdgJSON('/api/products');
        tdgPOSProducts=Array.isArray(d?.data)?d.data:(Array.isArray(d)?d:[]);
      }catch(e){
        if(!tdgPOSProducts.length){
          box.innerHTML='<div class="tdg-empty">Products could not be loaded: '+htmlEscape(e.message)+'</div>';
          return;
        }
      }
      const q=String($('tdgPOSSearch')?.value||'').toLowerCase().trim();
      const rows=tdgPOSProducts.filter(p=>String(p.name||'').toLowerCase().includes(q)).slice(0,60);
      box.innerHTML=rows.map(p=>{
        const image=typeof tdgImage==='function'?tdgImage(p):(p.imgs?.[0]||p.image||p.img||'');
        const stock=Number(p.qty||0);
        const disabled=stock<=0?' disabled aria-disabled="true"':'';
        return '<button class="tdg-pos-select"'+disabled+' onclick="tdgAddPOS('+JSON.stringify(String(p.id)).replace(/</g,'\\u003c')+')">'+
          '<div class="tdg-pos-thumb">'+(image?'<img src="'+htmlEscape(image)+'" alt="'+htmlEscape(p.name||'Product')+'" loading="lazy" onerror="this.style.display=\\'none\\'">':'<span>No image</span>')+'</div>'+
          '<strong>'+htmlEscape(p.name||'Product')+'</strong>'+
          '<div class="price">S$'+Number(p.price||0).toFixed(2)+'</div>'+
          '<div class="stock">'+stock+' in stock</div>'+
        '</button>';
      }).join('')||'<div class="tdg-empty">No products found.</div>';
      tdgRenderPOSCart();
    };

    window.tdgAddPOS=function(id){
      const p=tdgPOSProducts.find(x=>String(x.id)===String(id));if(!p)return;
      const available=Math.max(0,Number(p.qty||0));
      const existing=tdgPOSCart.find(x=>String(x.id)===String(p.id));
      const next=(existing?.qty||0)+1;
      if(next>available){alert('Not enough stock for '+(p.name||'this product')+'.');return;}
      if(existing)existing.qty=next;else tdgPOSCart.push({...p,qty:1});
      tdgRenderPOSCart();
    };

    window.tdgPOSCheckout=async function(){
      if(!tdgPOSCart.length){alert('Select at least one product.');return;}
      const name=String($('tdgPOSCustomer')?.value||'').trim();
      const mobile=String($('tdgPOSMobile')?.value||'').trim();
      const membership=String($('tdgPOSMembership')?.value||'').trim();
      const aura=String($('tdgPOSAura')?.value||'').trim();
      if(!name){alert('Enter the customer name.');return;}
      const total=tdgPOSCart.reduce((a,p)=>a+Number(p.price||0)*Number(p.qty||1),0);
      try{
        const d=await tdgJSON('/api/pos',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            customer:{name,mobile},
            membership_id:membership,
            aura_membership:aura,
            items:tdgPOSCart.map(p=>({id:String(p.id),qty:Number(p.qty||1),size:'',color:''})),
            payment_method:tdgPOSSelectedPayment,
            total
          })
        });
        alert('Sale completed: '+String(d?.data?.order_number||'Created')+' · S$'+Number(d?.data?.total||total).toFixed(2)+' · '+tdgPOSSelectedPayment);
        tdgPOSCart=[];
        ['tdgPOSCustomer','tdgPOSMobile','tdgPOSMembership','tdgPOSAura'].forEach(id=>{if($(id))$(id).value='';});
        tdgPOSPayment('NETS');
        tdgPOSProducts=[];
        await tdgRenderPOS();
      }catch(e){alert('POS sale could not be completed: '+e.message);}
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchPOS,{once:true});
  else patchPOS();
})();
</script>`;

  return html.replace('</body>',patch+'</body>');
}

module.exports=(req,res)=>{
  if(!isAdmin(req)){res.writeHead(302,{Location:'/'});return res.end()}
  const html=fs.readFileSync(path.join(process.cwd(),'public','dashboard.html'),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.status(200).send(injectPOSInventoryLink(html));
};
