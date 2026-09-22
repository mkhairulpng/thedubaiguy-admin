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

  const auraPatch=String.raw`
<style id="tdg-aura-logo-polish">
/* TheDubaiGuy dashboard branding */
img[alt*="TheDubaiGuy" i],
img[src*="the-dubai-guy" i]{filter:brightness(0) invert(1)!important}

/* Aura card uses the same internal alignment as the neighbouring KPI cards */
.tdg-aura-card-aligned{position:relative!important;box-sizing:border-box!important}
.tdg-aura-card-aligned{position:relative!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;padding:20px 30px!important;overflow:hidden!important}
.tdg-aura-card-aligned .tdg-aura-logo-compact{position:static!important;display:block!important;width:74px!important;height:74px!important;max-width:74px!important;max-height:74px!important;object-fit:contain!important;filter:brightness(0) invert(1)!important;z-index:2!important;margin:0 0 20px 0!important}
.tdg-aura-card-aligned .tdg-aura-logo-compact + *{margin-top:0!important}
.tdg-aura-logo-compact{width:74px!important;height:74px!important;max-width:74px!important;max-height:74px!important;object-fit:contain!important;filter:brightness(0) invert(1)!important}
.tdg-aura-logo-compact *{max-width:74px!important;max-height:74px!important}
.tdg-aura-side-logo-compact{width:53px!important;height:53px!important;max-width:53px!important;max-height:53px!important;object-fit:contain!important;filter:brightness(0) invert(1)!important}

/* Remove the separate Aura logo sitting above the side tray; keep the tray itself */
.tdg-aura-side-logo-top-remove{display:none!important}
</style>
<script>
(function(){
  function polishAura(){
    const nodes=[...document.querySelectorAll('img,svg,[class],[id]')];
    nodes.forEach(function(el){
      const meta=[
        el.getAttribute&&el.getAttribute('alt')||'',
        el.getAttribute&&el.getAttribute('src')||'',
        el.getAttribute&&el.getAttribute('class')||'',
        el.getAttribute&&el.getAttribute('id')||''
      ].join(' ').toLowerCase();
      if(!/aura/.test(meta))return;
      const isLogo=/logo|brand|mark|emblem/.test(meta);
      if(!isLogo)return;
      const tray=el.closest('aside,nav,[class*="tray" i],[class*="drawer" i],[class*="sidebar" i]');
      const card=el.closest('[class*="card" i],[class*="box" i],[class*="panel" i],[class*="tile" i]');
      if(tray){
        el.classList.add('tdg-aura-side-logo-compact');
        const parent=el.parentElement;
        if(parent){
          const pmeta=(parent.className||'').toString().toLowerCase()+' '+(parent.id||'').toLowerCase();
          if(/top|header|title|brand/.test(pmeta) && !/membership/.test(pmeta)){
            el.classList.add('tdg-aura-side-logo-top-remove');
          }
        }
      }else if(card){
        el.classList.add('tdg-aura-logo-compact');
        card.classList.add('tdg-aura-card-aligned');
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polishAura,{once:true});
  else polishAura();
  new MutationObserver(function(){polishAura()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  const compactPatch=String.raw`
<style id="tdg-dashboard-compact-observability">
/* Compact dashboard cards + OBSERVABILITY-style headings */
.tdg-compact-box{padding:14px!important;border-radius:12px!important}
.tdg-compact-box > h1,.tdg-compact-box > h2,.tdg-compact-box > h3,.tdg-compact-box > h4,
.tdg-compact-box .card-title,.tdg-compact-box .panel-title,.tdg-compact-box .section-title,
.tdg-compact-box [class*="title" i]{font-size:11px!important;line-height:1.2!important;
  font-weight:600!important;letter-spacing:.12em!important;text-transform:uppercase!important}
.tdg-compact-box .value,.tdg-compact-box .metric,.tdg-compact-box .kpi-value{line-height:1.05!important}
.tdg-compact-box{gap:10px!important}
@media(max-width:900px){.tdg-compact-box{padding:12px!important}}
</style>
<script>
(function(){
  function compactDashboard(){
    const root=document.querySelector('main')||document.body;
    const candidates=[...root.querySelectorAll('[class*="card" i],[class*="panel" i],[class*="widget" i],[class*="box" i],[class*="kpi" i]')];
    candidates.forEach(function(el){
      if(el.closest('.tdg-pos-select'))return;
      const text=(el.innerText||'').trim();
      if(!text || text.length>700)return;
      const heading=el.querySelector('h1,h2,h3,h4,.card-title,.panel-title,.section-title,[class*="title" i]');
      if(!heading)return;
      el.classList.add('tdg-compact-box');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactDashboard,{once:true});
  else compactDashboard();
  new MutationObserver(function(){compactDashboard()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  const auraContentPatch=String.raw`
<style id="tdg-aura-content-order">
.tdg-aura-content-order{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:0!important;padding:0!important}
.tdg-aura-content-order .tdg-aura-logo-compact{position:static!important;display:block!important;margin:0 0 4px 0!important}
.tdg-aura-unit-line{font-size:38px!important;line-height:1.05!important;font-weight:500!important;margin:0!important}
.tdg-aura-customer-line{font-size:20px!important;line-height:1.2!important;margin:0!important}
</style>
<script>
(function(){
  function arrangeAura(){
    const nodes=[...document.querySelectorAll('body *')];
    const auraCards=nodes.filter(el=>{
      const t=(el.innerText||'').replace(/\\s+/g,' ').trim();
      return t && /Aura Membership/i.test(t) && /\\b\\d+\\s+customers?\\b/i.test(t) && t.length<500;
    });
    auraCards.forEach(card=>{
      const logo=card.querySelector('.tdg-aura-logo-compact');
      if(!logo)return;
      card.classList.add('tdg-aura-content-order');
      const customer=[...card.querySelectorAll('*')].find(el=>/^\\d+\\s+customers?$/i.test((el.textContent||'').trim()));
      if(customer){
        customer.classList.add('tdg-aura-customer-line');
        let unit=[...card.querySelectorAll('*')].find(el=>{
          const t=(el.textContent||'').trim();
          return /^\\d+(?:\\.\\d+)?$/.test(t) && el!==customer && !el.querySelector('*');
        });
        if(unit){
          unit.textContent=unit.textContent.trim()+' units';
          unit.classList.add('tdg-aura-unit-line');
        }
        if(customer.parentElement && customer.parentElement!==card){
          customer.parentElement.classList.add('tdg-aura-customer-line');
        }
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrangeAura,{once:true});
  else arrangeAura();
  new MutationObserver(function(){arrangeAura()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  const topLeftLogoPatch=String.raw`
<style id="tdg-remove-top-left-branding">
/* Remove only the extra branding logos in the dashboard's top-left/header area.
   Keep the Aura logo inside the Aura KPI card. */
.tdg-remove-top-left-logo{display:none!important}
</style>
<script>
(function(){
  function removeTopLeftLogos(){
    const els=[...document.querySelectorAll('img,svg,[role="img"]')];
    els.forEach(function(el){
      if(el.closest('.tdg-aura-card-aligned,.tdg-aura-content-order,.tdg-aura-logo-compact'))return;
      const r=el.getBoundingClientRect();
      if(r.width<8||r.height<8)return;
      const inTopLeft=r.top>=0 && r.top<180 && r.left<360;
      if(!inTopLeft)return;
      const meta=((el.getAttribute('alt')||'')+' '+(el.getAttribute('src')||'')+' '+(el.getAttribute('class')||'')+' '+(el.getAttribute('id')||'')).toLowerCase();
      if(/the.?dubai.?guy|tdg|logo|brand/.test(meta)){
        el.classList.add('tdg-remove-top-left-logo');
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeTopLeftLogos,{once:true});
  else removeTopLeftLogos();
  new MutationObserver(removeTopLeftLogos).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  const auraKpiExactPatch=String.raw`
<style id="tdg-aura-kpi-exact">
/* Make Aura use the exact KPI rhythm of the neighbouring Paid orders / Inventory cards */
.tdg-aura-kpi-exact{position:relative!important;box-sizing:border-box!important;overflow:hidden!important}
.tdg-aura-kpi-exact .tdg-aura-logo-compact{position:absolute!important;top:20px!important;left:30px!important;width:74px!important;height:74px!important;max-width:74px!important;max-height:74px!important;margin:0!important;object-fit:contain!important;filter:brightness(0) invert(1)!important}
.tdg-aura-kpi-value{position:absolute!important;top:120px!important;left:30px!important;margin:0!important;line-height:1.05!important}
.tdg-aura-kpi-customers{position:absolute!important;top:210px!important;left:30px!important;margin:0!important;line-height:1.2!important}
@media(max-width:900px){
 .tdg-aura-kpi-exact .tdg-aura-logo-compact{left:20px!important}
 .tdg-aura-kpi-value{left:20px!important}
 .tdg-aura-kpi-customers{left:20px!important}
}
</style>
<script>
(function(){
  function exactAura(){
    const cards=[...document.querySelectorAll('[class*="card" i],[class*="box" i],[class*="panel" i],[class*="tile" i]')];
    cards.forEach(function(card){
      const text=(card.innerText||'').replace(/\\s+/g,' ').trim();
      if(!/Aura Membership/i.test(text))return;
      const logo=card.querySelector('.tdg-aura-logo-compact');
      const customer=[...card.querySelectorAll('*')].find(el=>/^\\d+\\s+customers?$/i.test((el.textContent||'').trim()) && !el.children.length);
      if(!logo||!customer)return;
      card.classList.add('tdg-aura-kpi-exact');
      const value=[...card.querySelectorAll('*')].find(el=>/^\\d+(?:\\.\\d+)?$/.test((el.textContent||'').trim()) && !el.children.length && el!==customer);
      if(value)value.classList.add('tdg-aura-kpi-value');
      customer.classList.add('tdg-aura-kpi-customers');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',exactAura,{once:true});
  else exactAura();
  new MutationObserver(exactAura).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;

  const auraKpiMirrorPatch=String.raw`
<style id="tdg-aura-kpi-mirror">
/* Mirror the real neighbouring KPI card geometry instead of using guessed offsets. */
.tdg-aura-kpi-mirror{position:relative!important;box-sizing:border-box!important;overflow:hidden!important}
.tdg-aura-kpi-mirror .tdg-aura-logo-compact,
.tdg-aura-kpi-mirror .tdg-aura-kpi-value,
.tdg-aura-kpi-mirror .tdg-aura-kpi-customers{
  position:absolute!important;
  margin:0!important;
}
.tdg-aura-kpi-mirror .tdg-aura-logo-compact{
  object-fit:contain!important;
  filter:brightness(0) invert(1)!important;
  z-index:2!important;
}
</style>
<script>
(function(){
  function leafText(root,pattern){
    return [...root.querySelectorAll('*')].find(function(el){
      return !el.children.length && pattern.test((el.textContent||'').replace(/\\s+/g,' ').trim());
    });
  }
  function mirrorAura(){
    const all=[...document.querySelectorAll('[class*="card" i],[class*="box" i],[class*="panel" i],[class*="tile" i]')];
    const aura=all.find(function(el){
      const t=(el.innerText||'').replace(/\\s+/g,' ').trim();
      return /Aura Membership/i.test(t) && /\\b\\d+\\s+customers?\\b/i.test(t);
    });
    if(!aura)return;
    const reference=all.find(function(el){
      const t=(el.innerText||'').replace(/\\s+/g,' ').trim();
      return /Paid Orders/i.test(t) && !/Aura Membership/i.test(t);
    }) || all.find(function(el){
      const t=(el.innerText||'').replace(/\\s+/g,' ').trim();
      return /Last 7 days/i.test(t) && !/Aura Membership/i.test(t);
    });
    if(!reference)return;
    const logo=aura.querySelector('.tdg-aura-logo-compact');
    const value=leafText(aura,/^\\d+(?:\\.\\d+)?$/);
    const customers=leafText(aura,/^\\d+\\s+customers?$/i);
    const refTitle=leafText(reference,/^(Paid Orders|Paid orders)$/i);
    const refValue=leafText(reference,/^\\d+(?:\\.\\d+)?$/);
    const refSub=leafText(reference,/^Last 7 days$/i);
    if(!logo||!value||!customers||!refValue||!refSub)return;

    aura.classList.add('tdg-aura-kpi-mirror');

    const ar=aura.getBoundingClientRect();
    function place(el,refEl,extra){
      const rr=refEl.getBoundingClientRect();
      el.style.left=Math.round(rr.left-ar.left)+'px';
      el.style.top=Math.round(rr.top-ar.top)+'px';
      if(extra)Object.keys(extra).forEach(k=>el.style[k]=extra[k]);
    }

    /* Logo occupies the same title position as Paid Orders. */
    if(refTitle) place(logo,refTitle,{width:'74px',height:'74px',maxWidth:'74px',maxHeight:'74px'});
    else place(logo,refValue,{width:'74px',height:'74px',maxWidth:'74px',maxHeight:'74px'});

    /* Aura unit count and customer line occupy the exact same vertical rhythm. */
    place(value,refValue,{lineHeight:getComputedStyle(refValue).lineHeight,fontSize:getComputedStyle(refValue).fontSize,fontWeight:getComputedStyle(refValue).fontWeight});
    place(customers,refSub,{lineHeight:getComputedStyle(refSub).lineHeight,fontSize:getComputedStyle(refSub).fontSize,fontWeight:getComputedStyle(refSub).fontWeight});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mirrorAura,{once:true});
  else mirrorAura();
  new MutationObserver(function(){requestAnimationFrame(mirrorAura)}).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',mirrorAura);
})();
</script>`;

  const netsSettlementPatch=String.raw`
<style id="tdg-nets-settlement-layout">
/* NETS settlement card: logo left, transactions underneath, amount on right. */
.tdg-nets-settlement{position:relative!important;box-sizing:border-box!important;overflow:hidden!important}
.tdg-nets-settlement .tdg-nets-logo,
.tdg-nets-settlement .tdg-nets-transactions,
.tdg-nets-settlement .tdg-nets-amount{position:absolute!important;margin:0!important}
.tdg-nets-settlement .tdg-nets-logo{
  left:30px!important;top:28px!important;
  width:130px!important;height:48px!important;
  max-width:130px!important;max-height:48px!important;
  object-fit:contain!important;object-position:left center!important;
}
.tdg-nets-settlement .tdg-nets-transactions{
  left:30px!important;bottom:28px!important;
  font-size:18px!important;line-height:1.2!important;
}
.tdg-nets-settlement .tdg-nets-amount{
  right:30px!important;top:50%!important;transform:translateY(-50%)!important;
  font-size:42px!important;line-height:1.05!important;font-weight:600!important;
  text-align:right!important;white-space:nowrap!important;
}
@media(max-width:700px){
  .tdg-nets-settlement .tdg-nets-logo{left:20px!important;top:22px!important;width:105px!important;height:42px!important}
  .tdg-nets-settlement .tdg-nets-transactions{left:20px!important;bottom:20px!important;font-size:16px!important}
  .tdg-nets-settlement .tdg-nets-amount{right:20px!important;font-size:32px!important}
}
</style>
<script>
(function(){
  function leaf(root,pattern){
    return [...root.querySelectorAll('*')].find(function(el){
      return !el.children.length && pattern.test((el.textContent||'').replace(/\\s+/g,' ').trim());
    });
  }
  function findLogo(root){
    return [...root.querySelectorAll('img,svg,[role="img"]')].find(function(el){
      const meta=((el.getAttribute('alt')||'')+' '+(el.getAttribute('src')||'')+' '+(el.getAttribute('class')||'')+' '+(el.getAttribute('id')||'')).toLowerCase();
      return /nets/.test(meta);
    }) || leaf(root,/^NETS$/i);
  }
  function arrangeNETS(){
    const cards=[...document.querySelectorAll('[class*="card" i],[class*="box" i],[class*="panel" i],[class*="tile" i]')];
    cards.forEach(function(card){
      const text=(card.innerText||'').replace(/\\s+/g,' ').trim();
      if(!/\\bNETS\\b/i.test(text))return;
      if(!/\\b\\d+\\s+transactions?\\b/i.test(text))return;
      if(!/S\\$\\s*[-+]?\\d[\\d,.]*/i.test(text))return;
      const logo=findLogo(card);
      const transactions=leaf(card,/^\\d+\\s+transactions?$/i);
      const amount=leaf(card,/^S\\$\\s*[-+]?\\d[\\d,.]*$/i);
      if(!logo||!transactions||!amount)return;
      card.classList.add('tdg-nets-settlement');
      logo.classList.add('tdg-nets-logo');
      transactions.classList.add('tdg-nets-transactions');
      amount.classList.add('tdg-nets-amount');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrangeNETS,{once:true});
  else arrangeNETS();
  new MutationObserver(function(){arrangeNETS()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
    const kpiCompactPatch=String.raw`
<style id="tdg-kpi-compact-exact">
.tdg-kpi-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px!important;width:100%!important}
.tdg-kpi-compact-card{position:relative!important;box-sizing:border-box!important;min-width:0!important;height:150px!important;padding:18px 20px!important;border-radius:16px!important;overflow:hidden!important;display:block!important;background:rgba(28,29,30,.92)!important;border:1px solid rgba(255,255,255,.13)!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important}
.tdg-ga-heading-match{font-size:11px!important;line-height:1.2!important;font-weight:400!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:rgba(255,255,255,.72)!important}
.tdg-kpi-compact-card .tdg-kpi-title{position:absolute!important;left:20px!important;top:17px!important;font-size:11px!important;line-height:1.2!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:rgba(255,255,255,.72)!important;margin:0!important}
.tdg-kpi-compact-card .tdg-kpi-value{position:absolute!important;left:20px!important;top:48px!important;font-size:34px!important;line-height:1.05!important;font-weight:500!important;letter-spacing:-.025em!important;color:#fff!important;margin:0!important}
.tdg-kpi-compact-card .tdg-kpi-sub{position:absolute!important;left:20px!important;bottom:18px!important;font-size:8px!important;line-height:1.2!important;color:rgba(255,255,255,.58)!important;margin:0!important;text-transform:uppercase!important;letter-spacing:.08em!important}
.tdg-kpi-compact-card .tdg-kpi-badge{position:absolute!important;right:16px!important;top:16px!important;border-radius:11px!important;padding:6px 10px!important;font-size:12px!important;line-height:1!important;font-weight:600!important;background:rgba(255,255,255,.10)!important;color:rgba(255,255,255,.78)!important}
.tdg-kpi-compact-card .tdg-kpi-badge.up{background:rgba(71,214,147,.14)!important;color:#75e6ae!important}.tdg-kpi-compact-card .tdg-kpi-badge.down{background:rgba(255,92,92,.13)!important;color:#ff8c8c!important}
.tdg-kpi-compact-card .tdg-kpi-spark{position:absolute!important;right:18px!important;bottom:17px!important;width:128px!important;height:36px!important;opacity:.95!important}
.tdg-kpi-compact-card .tdg-kpi-spark svg{width:100%!important;height:100%!important;overflow:visible!important}.tdg-kpi-compact-card .tdg-kpi-spark path,.tdg-kpi-compact-card .tdg-kpi-spark polyline{fill:none!important;stroke:rgba(255,255,255,.88)!important;stroke-width:2!important;vector-effect:non-scaling-stroke!important}
@media(max-width:1050px){.tdg-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:650px){.tdg-kpi-row{grid-template-columns:1fr!important;gap:12px!important}.tdg-kpi-compact-card{height:138px!important}}
</style>
<script>
(function(){
 function text(el){return(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim()}
 function leaf(root,re){return[...root.querySelectorAll('*')].find(function(x){return!x.children.length&&re.test(text(x))})}
 function cardFor(label){const node=[...document.querySelectorAll('body *')].find(function(x){return!x.children.length&&text(x).toLowerCase()===label.toLowerCase()});if(!node)return null;let p=node;for(let i=0;i<7&&p;i++,p=p.parentElement){const r=p.getBoundingClientRect(),t=text(p);if(r.width>=260&&r.height>=110&&r.height<=420&&t.length<450)return p}return node.parentElement}
 function badge(card){return[...card.querySelectorAll('*')].find(function(x){if(x.children.length)return false;const t=text(x);return/^(?:[▲▼↑↓]\s*)?\d+(?:\.\d+)?%?$/.test(t)||/\btotal\b/i.test(t)||/^[▲▼↑↓]\s*\d+/.test(t)})}
 function spark(card){const s=card.querySelector('svg');if(!s)return null;const wrap=document.createElement('div');wrap.className='tdg-kpi-spark';wrap.appendChild(s.cloneNode(true));return wrap}
 function compact(){const labels=['Stripe revenue','Paid orders','AURA','Inventory value'],cards=labels.map(cardFor);if(cards.some(x=>!x))return;const unique=[...new Set(cards)];if(unique.length!==4)return;let row=unique[0].parentElement;while(row&&row!==document.body){const kids=[...row.children];if(kids.filter(k=>unique.includes(k)).length>=3)break;row=row.parentElement}if(!row)row=unique[0].parentElement;row.classList.add('tdg-kpi-row');unique.forEach(function(card){card.classList.add('tdg-kpi-compact-card');const labelNode=[...card.querySelectorAll('*')].find(x=>!x.children.length&&['stripe revenue','paid orders','aura','inventory value'].includes(text(x).toLowerCase())),valueNode=leaf(card,/^\$[\d,.]+$|^[\d,.]+$/),subNode=leaf(card,/^(?:Live paid orders|Last 7 days|\d+ customers?|\d+ units)$/i),b=badge(card);if(labelNode)labelNode.classList.add('tdg-kpi-title');if(valueNode&&valueNode!==labelNode)valueNode.classList.add('tdg-kpi-value');if(subNode&&subNode!==valueNode)subNode.classList.add('tdg-kpi-sub');if(b&&b!==valueNode&&b!==subNode)b.classList.add('tdg-kpi-badge');const bt=b?text(b):'';if(b&&/^[▲↑]/.test(bt))b.classList.add('up');if(b&&/^[▼↓]/.test(bt))b.classList.add('down');if(!card.querySelector('.tdg-kpi-spark')){const sw=spark(card);if(sw)card.appendChild(sw)}})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compact,{once:true});else compact();
 new MutationObserver(function(){requestAnimationFrame(compact)}).observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('resize',compact);
function tdgMatchPaymentHeadings(){
  const wanted=new Set(['stripe revenue','paid orders','inventory value',"today's settlements",'stripe payout','stripe live payments']);
  document.querySelectorAll('body *').forEach(function(el){
    if(el.children.length)return;
    const t=(el.textContent||'').trim().toLowerCase();
    if(!wanted.has(t))return;
    el.classList.add('tdg-ga-heading-match');
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tdgMatchPaymentHeadings,{once:true});else tdgMatchPaymentHeadings();
new MutationObserver(function(){requestAnimationFrame(tdgMatchPaymentHeadings)}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  const auraWordmarkPatch=String.raw`
<style id="tdg-aura-wordmark-white">
.tdg-aura-wordmark{display:block!important;width:130px!important;height:auto!important;max-width:130px!important;max-height:none!important;object-fit:contain!important;filter:none!important}
.tdg-aura-side-wordmark{display:block!important;width:100px!important;height:auto!important;max-width:100px!important;max-height:none!important;object-fit:contain!important;filter:none!important}
.tdg-aura-kpi-exact .tdg-aura-wordmark{width:130px!important;height:auto!important;max-width:130px!important;max-height:none!important}
.tdg-aura-kpi-mirror .tdg-aura-wordmark{width:130px!important;height:auto!important;max-width:130px!important;max-height:none!important}
</style>
<script>
(function(){
  const src='data:image/png;base64,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';
  function replaceAuraWordmarks(){
    document.querySelectorAll('.tdg-aura-logo-compact, .tdg-aura-side-logo-compact').forEach(function(el){
      const isSide=el.classList.contains('tdg-aura-side-logo-compact');
      if(el.tagName==='IMG'){
        el.src=src;
        el.removeAttribute('srcset');
        el.classList.add(isSide?'tdg-aura-side-wordmark':'tdg-aura-wordmark');
        el.style.setProperty('width',isSide?'100px':'130px','important');
        el.style.setProperty('height','auto','important');
        el.style.setProperty('max-width',isSide?'100px':'130px','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('filter','none','important');
      }else{
        const img=document.createElement('img');
        img.src=src;
        img.alt='AURA';
        img.className=(isSide?'tdg-aura-side-wordmark':'tdg-aura-wordmark')+' '+(isSide?'tdg-aura-side-logo-compact':'tdg-aura-logo-compact');
        img.style.setProperty('width',isSide?'100px':'130px','important');
        img.style.setProperty('height','auto','important');
        img.style.setProperty('max-width',isSide?'100px':'130px','important');
        img.style.setProperty('max-height','none','important');
        img.style.setProperty('filter','none','important');
        el.replaceWith(img);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',replaceAuraWordmarks,{once:true});
  else replaceAuraWordmarks();
  new MutationObserver(function(){replaceAuraWordmarks()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;


  const posCatalogPatch=String.raw`
<style id="tdg-pos-category-catalog">
.tdg-pos-category-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.tdg-pos-category-tabs button{border:1px solid var(--line);background:rgba(255,255,255,.035);color:var(--text);border-radius:999px;padding:8px 13px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.tdg-pos-category-tabs button.active{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)}
.tdg-pos-category-note{font-size:10px;color:var(--muted);margin:0 0 10px}
.tdg-pos-category-empty{padding:20px;text-align:center;color:var(--muted);font-size:12px}
</style>
<script>
(function(){
  const catalog=[{"id":"atlantis-abaya","name":"Atlantis Abaya","cat":"women","subcat":"abaya","price":180,"badge":"New","collection":"Atlantis Collection","imgs":["atlantis_coral"],"sizes":["52","54","56","58","60"],"colors":[{"name":"Coral","img":"atlantis_coral","price":220},{"name":"Sand","img":"atlantis_sandy","price":180},{"name":"Sea Breeze","img":"atlantis_breeze","price":180}],"lede":"An open-front abaya from the Atlantis Collection, hand-illustrated with an underwater world of turtles, seahorses and coral. Available in three shades.","details":"A flowing open-front abaya printed with an exclusive watercolour reef. Wide sleeves, fluid drape and a clean centre opening, with signature THEDUBAIGUY detail at the cuff. Choose Coral (warm terracotta), Sand (soft neutral) or Sea Breeze (cool aqua).","material":"Premium silk-touch satin · Open front · Dry clean only · Atlantis Collection"},{"id":"batik-cempaka-abaya","name":"Batik Cempaka Silk Satin Abaya Set","cat":"women","price":170,"badge":"New","imgs":["cempaka_1","cempaka_2","cempaka_4","cempaka_3"],"sizes":["52","54","56","58","60"],"lede":"A flowing kaftan-cut abaya in premium silk satin, printed with the blue-and-cream Cempaka batik and finished with a matching shawl.","details":"Cut from lustrous premium silk satin with a graceful kaftan silhouette and wide sleeves. Supplied as a two-piece set — abaya and matching batik shawl. Exclusive hand-drawn Cempaka batik print in indigo, slate and cream.","material":"100% Premium Silk Satin · Dry clean only · Two-piece set (abaya + shawl)"},{"id":"batik-nusantara-abaya","name":"Batik Nusantara Silk Satin Abaya Set","cat":"women","price":170,"badge":"New","imgs":["nusantara_1","nusantara_2"],"sizes":["52","54","56","58","60"],"lede":"An heirloom navy-and-copper batik abaya in silk satin, with an ornamented placket and matching shawl.","details":"A richly patterned abaya in deep navy with copper and cream batik motifs and a decorative centre placket. Flowing silk satin drape with wide sleeves. Supplied with a coordinating batik shawl.","material":"100% Premium Silk Satin · Dry clean only · Two-piece set (abaya + shawl)"},{"id":"cempaka-shawl","name":"Batik Cempaka Silk Satin Shawl","cat":"women","price":79,"imgs":["cempaka_3","cempaka_1"],"sizes":["One Size"],"lede":"The signature Cempaka batik shawl in soft silk satin — the perfect finishing layer.","details":"Generously sized silk satin shawl in the blue-and-cream Cempaka batik. Fluid drape that ties and wraps beautifully. Pairs with the Cempaka abaya or worn on its own.","material":"100% Premium Silk Satin · Approx. 180 × 70 cm · Dry clean only"},{"id":"nusantara-shawl","name":"Batik Nusantara Silk Satin Shawl","cat":"women","price":79,"imgs":["nusantara_2","nusantara_1"],"sizes":["One Size"],"lede":"The Nusantara batik shawl in silk satin — navy, copper and cream.","details":"A luxuriously soft silk satin shawl carrying the Nusantara batik motif. A versatile modest layer that complements the abaya or elevates any outfit.","material":"100% Premium Silk Satin · Approx. 180 × 70 cm · Dry clean only"},{"id":"lumiere-abaya","name":"Lumière Embellished Abaya","cat":"women","subcat":"abaya","price":260,"soldout":true,"collection":"Lumière Collection","imgs":["lumiere_black"],"sizes":["52","54","56","58","60"],"colors":[{"name":"Black","img":"lumiere_black"},{"name":"Rose","img":"lumiere_rose"},{"name":"Powder Blue","img":"lumiere_blue"}],"lede":"An open-front abaya scattered with hand-set pearl and crystal florals, from the Lumière Collection. Available in three shades.","details":"A softly draping open-front abaya adorned with hand-placed pearl and crystal floral clusters across the body and a jewelled neckline. From the Lumière Collection — occasion dressing at its most refined. Available in Black, Rose and Powder Blue.","material":"Premium crêpe · Hand-embellished pearl & crystal detail · Dry clean only · Lumière Collection"},{"id":"tw-jardin","name":"Longline Outerwear — Jardin","cat":"women","subcat":"travelwear","price":150,"soldout":true,"imgs":["tw_jardin"],"sizes":["S","M","L","XL"],"lede":"A fluid charcoal open outerwear with trailing botanical embroidery and contrast piping — effortless layering for travel.","details":"A lightweight, longline open abaya-coat in soft charcoal, framed with cascading leaf embroidery on the shoulders and cuffs and finished with delicate contrast piping. Designed to layer over any outfit.","material":"Lightweight woven · Open front · Machine wash cold · Travel Wear"},{"id":"tw-jardin-2","name":"Longline Outerwear — Jardin II","cat":"women","subcat":"travelwear","price":150,"soldout":true,"imgs":["tw_jardin2"],"sizes":["S","M","L","XL"],"lede":"The Jardin outerwear in ivory, with gold-and-blue botanical embroidery — light, airy and elegant.","details":"An ivory longline open outerwear with trailing gold and blue leaf embroidery across the shoulders and sleeves. A graceful, breathable layer for warm-weather travel.","material":"Lightweight woven · Open front · Machine wash cold · Travel Wear"},{"id":"tw-mosaic","name":"Longline Outerwear — Mosaic","cat":"women","subcat":"travelwear","price":140,"soldout":true,"imgs":["tw_mosaic"],"sizes":["S","M","L","XL"],"lede":"A relaxed white outerwear with pink-and-blue geometric mosaic embroidery and a tie waist.","details":"A breezy longline open jacket in white linen-touch fabric, patterned with a pink and blue mosaic embroidery down the front and cuffs, with an optional tie belt and side pockets.","material":"Linen-touch woven · Open front · Tie belt · Machine wash cold · Travel Wear"},{"id":"tw-toile","name":"Heritage Toile Co-ord Set","cat":"women","subcat":"travelwear","price":160,"soldout":true,"imgs":["tw_toile"],"sizes":["S","M","L","XL"],"lede":"A relaxed kimono-and-trouser co-ord in a hand-drawn architectural toile print.","details":"A two-piece travel co-ord — a belted kimono jacket and wide-leg trousers — in a soft ivory ground with a hand-illustrated heritage toile of domes, arches and palms.","material":"Soft viscose blend · Two-piece set · Machine wash cold · Travel Wear"},{"id":"tw-satin-buttercream","name":"Satin Co-ord Set — Buttercream","cat":"women","subcat":"travelwear","price":140,"soldout":true,"imgs":["tw_satin_yellow"],"sizes":["S","M","L","XL"],"lede":"A liquid-satin kimono and wide-leg trouser set in soft buttercream — quietly luxurious.","details":"A fluid satin two-piece — belted kimono and wide-leg trousers — in a soft buttercream tone. Relaxed, elegant and made to move.","material":"Satin · Two-piece set · Belted · Dry clean recommended · Travel Wear"},{"id":"tw-satin-blue","name":"Satin Co-ord Set — Powder Blue","cat":"women","subcat":"travelwear","price":140,"soldout":true,"imgs":["tw_satin_blue"],"sizes":["S","M","L","XL"],"lede":"The satin co-ord in a serene powder blue — kimono and wide-leg trousers.","details":"A fluid satin two-piece — belted kimono and wide-leg trousers — in a calming powder blue. Effortless resort and travel dressing.","material":"Satin · Two-piece set · Belted · Dry clean recommended · Travel Wear"},{"id":"kanzu-thobe-sage","name":"Kanzu Embroidered Thobe — Sage","cat":"men","price":89,"soldout":true,"imgs":["men_thobe"],"sizes":["52","54","56","58","60"],"lede":"A relaxed half-sleeve thobe in soft sage, finished with hand-detailed olive embroidery at the placket and cuffs.","details":"Cut for an easy, elegant drape with a mandarin split neckline and a decorative embroidered placket. Half sleeves with matching embroidered trim and side pockets. A refined everyday thobe for warm climates.","material":"Premium poly-cotton blend · Machine wash cold · Half sleeve · Side pockets","addons":["addon-egyptian-tshirt","addon-cotton-bottoms"]},{"id":"kanzu-thobe-cream","name":"Kanzu Thobe — Pure Cream","cat":"men","price":89,"soldout":true,"imgs":["men_thobe_cream"],"sizes":["52","54","56","58","60"],"lede":"A clean half-sleeve thobe in pure cream linen-touch, with a subtle tonal embroidered placket.","details":"An understated everyday thobe in soft cream with a mandarin split neckline and delicate tone-on-tone embroidery at the placket. Half sleeves and discreet side pockets — effortless for warm days and relaxed evenings.","material":"Premium linen-touch blend · Machine wash cold · Half sleeve · Side pockets","addons":["addon-egyptian-tshirt","addon-cotton-bottoms"]},{"id":"takhayal-edp","name":"Takhayal Eau de Parfum 50ml","cat":"perfumes","price":75,"badge":"Bestseller","imgs":["perfume_takhayal","banner_takhayal"],"sizes":["50ml"],"lede":"","details":"Takhayal opens on velvety Taif rose, settling into a heart of creamy sandalwood before a deep agarwood (oud) drydown. Long-lasting eau de parfum concentration. Unisex.","material":"Eau de Parfum · 50ml · Notes: Rose, Sandalwood, Agarwood (Oud)"},{"id":"dhahabi-edp","name":"Dhahabi Eau de Parfum 50ml","cat":"perfumes","price":65,"imgs":["perfume_dhahabi"],"sizes":["50ml"],"lede":"","details":"A golden amber composition lifted by saffron and warm spice, wrapped around resins and precious woods for a rich, glowing trail. Long-lasting eau de parfum. Unisex.","material":"Eau de Parfum · 50ml · Notes: Amber, Saffron, Precious Woods"},{"id":"sandalwood-oud-30","name":"Sandalwood Oud Incense — Pack of 30","cat":"home","price":35,"badge":"Bestseller","imgs":["incense"],"sizes":["Pack of 30"],"lede":"Hand-rolled sandalwood and oud incense sticks to fill your home with a warm, resinous calm.","details":"Slow-burning incense sticks blended with sandalwood and oud. Each stick burns for approximately 45 minutes. Pack of 30, in signature paper wrap.","material":"30 incense sticks · Sandalwood & Oud · ~45 min burn time"},{"id":"sandalwood-oud-60","name":"Sandalwood Oud Incense — Pack of 60","cat":"home","price":65,"imgs":["incense"],"sizes":["Pack of 60"],"lede":"Our sandalwood and oud incense in a generous value pack of 60 sticks.","details":"The same slow-burning sandalwood-and-oud incense, in a larger pack of 60 sticks. Ideal for daily ritual or gifting.","material":"60 incense sticks · Sandalwood & Oud · ~45 min burn time"},{"id":"bukhoor-home-incense","name":"Bukhoor Home Incense","cat":"home","price":45,"soldout":true,"imgs":["incense"],"sizes":["50g","100g"],"lede":"Traditional bakhoor — fragrant wood chips blended with resins and oud, to perfume your home for gatherings and everyday calm.","details":"Hand-blended bukhoor (bakhoor) of scented wood chips, natural resins and oud. Warm on a charcoal disc or electric burner and let the fragrance fill the room. A cherished ritual of welcome across the Gulf and Southeast Asia.","material":"Bakhoor wood-chip incense · Burn on charcoal or electric burner · Contains oud & resins"}];
  const cats=[['all','All'],['men','Men'],['women','Women'],['perfumes','Perfume'],['home','Home']];
  function boot(){
    const box=$('tdgPOSProducts');
    if(!box)return;
    if(window.tdgPOSCatalogFallback)return;
    window.tdgPOSCatalogFallback=catalog.map(function(p){return Object.assign({},p,{qty:p.soldout?0:10,images:p.imgs||[]})});
    window.tdgPOSCategory='all';
    function imageFor(p){try{const ids=p&&(p.images||p.imgs);const id=Array.isArray(ids)?ids[0]:'';const images=window.TDG_PRODUCT_IMAGES||{};if(id&&images[id])return images[id];if(typeof tdgImage==='function'){const value=tdgImage(p);if(value)return value}}catch(e){}return ''}
    function install(){
      const box=$('tdgPOSProducts');if(!box)return;
      if(!document.getElementById('tdgPOSCategoryTabs')){
        const tabs=document.createElement('div');tabs.id='tdgPOSCategoryTabs';tabs.className='tdg-pos-category-tabs';
        cats.forEach(function(c){
          const b=document.createElement('button');b.type='button';b.dataset.cat=c[0];b.textContent=c[1];
          b.onclick=function(){window.tdgPOSCategory=c[0];tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');window.tdgRenderPOS()};
          tabs.appendChild(b);
        });
        box.parentElement.insertBefore(tabs,box);
        tabs.firstChild.classList.add('active');
      }
      if(!document.getElementById('tdgPOSCategoryNote')){
        const note=document.createElement('div');note.id='tdgPOSCategoryNote';note.className='tdg-pos-category-note';
        note.textContent='Categories use the same product catalog as Products.';
        box.parentElement.insertBefore(note,box);
      }
    }
    const original=window.tdgRenderPOS;
    window.tdgRenderPOS=async function(){
      install();
      try{
        const d=await tdgJSON('/api/products');
        if(Array.isArray(d&&d.data)&&d.data.length){tdgPOSProducts=d.data}
        else throw new Error('Product API returned no products');
      }catch(e){
        tdgPOSProducts=window.tdgPOSCatalogFallback.slice();
      }
      const q=String($('tdgPOSSearch')&&$('tdgPOSSearch').value||'').toLowerCase().trim();
      const cat=window.tdgPOSCategory||'all';
      const rows=tdgPOSProducts.filter(function(p){
        const pc=String(p.category||p.cat||'').toLowerCase();
        return (cat==='all'||pc===cat) && String(p.name||'').toLowerCase().includes(q);
      }).slice(0,100);
      box.innerHTML=rows.map(function(p){
        const image=imageFor(p), stock=Number(p.qty||0), disabled=stock<=0?' disabled aria-disabled="true"':'';
        return '<button class="tdg-pos-select"'+disabled+' onclick="tdgAddPOS('+JSON.stringify(String(p.id)).replace(/</g,'\\u003c')+')">'+
          '<div class="tdg-pos-thumb">'+(image?'<img src="'+htmlEscape(image)+'" alt="'+htmlEscape(p.name||'Product')+'" loading="lazy" onerror="this.style.display=\\'none\\'">':'<span>No image</span>')+'</div>'+
          '<strong>'+htmlEscape(p.name||'Product')+'</strong>'+
          '<div class="price">S
+Number(p.price||0).toFixed(2)+'</div>'+
          '<div class="stock">'+(stock>0?stock+' in stock':'Sold out')+'</div></button>';
      }).join('')||'<div class="tdg-pos-category-empty">No products in this category.</div>';
      if(typeof tdgRenderPOSCart==='function')tdgRenderPOSCart();
    };
    install();
    window.tdgRenderPOS();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>`;

  const observabilityPatch=String.raw`
<style id="tdg-ga-observability">
.tdg-ga-observability{width:100%;box-sizing:border-box}
.tdg-ga-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}
.tdg-ga-title{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.tdg-ga-sub{font-size:9px;color:var(--muted);margin-top:3px}
.tdg-ga-live{font-size:9px;color:#8ee6a8;white-space:nowrap}
.tdg-ga-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-bottom:8px}
.tdg-ga-kpi{padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.025)}
.tdg-ga-kpi b{display:block;font-size:15px;line-height:1.05;margin-bottom:2px}
.tdg-ga-kpi span{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.tdg-ga-chart{border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-top:8px;padding:9px}
.tdg-ga-chart-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px}
.tdg-ga-chart svg{width:100%;height:170px;display:block}
.tdg-ga-table-wrap{border:1px solid var(--line);border-radius:8px;overflow:auto;margin-top:8px}
.tdg-ga-table-title{padding:7px 9px;font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;border-bottom:1px solid var(--line)}
.tdg-ga-table{width:100%;border-collapse:collapse;font-size:9px;min-width:980px}
.tdg-ga-table th,.tdg-ga-table td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;white-space:nowrap}
.tdg-ga-table th{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.tdg-ga-table td.num{text-align:right;font-variant-numeric:tabular-nums}
.tdg-ga-table tr:last-child td{border-bottom:0}
.tdg-ga-error{padding:12px;color:#ff9b9b;font-size:10px}
.tdg-ga-ok{padding:8px 10px;color:#8ee6a8;font-size:9px;border:1px solid rgba(142,230,168,.2);border-radius:8px;margin-top:8px}
@media(max-width:1100px){.tdg-ga-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.tdg-ga-summary{grid-template-columns:repeat(2,1fr)}.tdg-ga-table{min-width:980px}}
</style>
<script>
(function(){
  function esc(v){return htmlEscape(String(v==null?'':v))}
  function fmtTime(seconds){const s=Math.max(0,Math.round(Number(seconds||0)));const m=Math.floor(s/60),r=s%60;return m?m+'m '+r+'s':r+'s'}
  function pct(v){return (Number(v||0)*100).toFixed(1)+'%'}
  function money(v){return 'S$'+Number(v||0).toFixed(2)}
  function findPanel(){
    const mounted=document.getElementById('tdg-observability-panel');
    if(mounted)return mounted;
    const candidates=[...document.querySelectorAll('section,article,aside,div')].filter(function(el){
      if(el.children.length<1)return false;
      const t=(el.innerText||'').replace(/\s+/g,' ').trim();
      return t.length<2200 && /OBSERVABILITY/i.test(t) && (/Web Analytics/i.test(t)||/Speed Insights/i.test(t)||/Active users by City/i.test(t)||/Demographic details/i.test(t));
    });
    candidates.sort(function(a,b){return (a.innerText||'').length-(b.innerText||'').length});
    const host=candidates[0]||null;
    if(host)host.id='tdg-observability-panel';
    return host;
  }
  function ensureMount(){
    const existing=document.getElementById('tdg-observability-mount');
    if(existing)return existing;
    const host=findPanel();if(!host)return null;
    host.innerHTML='<div id="tdg-observability-mount"></div>';
    return document.getElementById('tdg-observability-mount');
  }
  function render(d){
    const mount=ensureMount();if(!mount)return;
    const countries=(d.demographicsByCountry||[]).slice(0,10);
    const cities=(d.activeUsersByCity||[]).slice(0,10);
    const pages=(d.pagesAndScreens||[]).slice(0,10);
    const hasData=Number(d.activeUsers||0)>0||countries.length>0||cities.length>0||pages.length>0;
    mount.innerHTML='<div class="tdg-ga-observability">'+
      '<div class="tdg-ga-head"><div><div class="tdg-ga-title">OBSERVABILITY</div><div class="tdg-ga-sub">Google Analytics 4 · Last 28 days</div></div><div class="tdg-ga-live">'+Number(d.realtimeUsers||0)+' active now</div></div>'+
      '<div class="tdg-ga-summary">'+
      '<div class="tdg-ga-kpi"><b>'+Number(d.activeUsers||0).toLocaleString()+'</b><span>Active users</span></div>'+
      '<div class="tdg-ga-kpi"><b>'+Number(d.newUsers||0).toLocaleString()+'</b><span>New users</span></div>'+
      '<div class="tdg-ga-kpi"><b>'+Number(d.sessions||0).toLocaleString()+'</b><span>Sessions</span></div>'+
      '<div class="tdg-ga-kpi"><b>'+pct(d.engagementRate)+'</b><span>Engagement rate</span></div>'+
      '<div class="tdg-ga-kpi"><b>'+Number(d.eventCount||0).toLocaleString()+'</b><span>Event count</span></div>'+
      '<div class="tdg-ga-kpi"><b>'+money(d.totalRevenue)+'</b><span>Total revenue</span></div>'+
      '</div>'+
      '<div class="tdg-ga-table-wrap"><div class="tdg-ga-table-title">Demographic details: Country · Last 28 days</div><table class="tdg-ga-table"><thead><tr>'+
      '<th>Country</th><th>Active users</th><th>New users</th><th>Engaged sessions</th><th>Engagement rate</th><th>Engaged sessions per active user</th><th>Average engagement time per active user</th><th>Event count</th><th>Key events</th><th>User key event rate</th><th>Total revenue</th>'+
      '</tr></thead><tbody>'+
      (countries.map(function(r){return '<tr><td><strong>'+esc(r.country)+'</strong></td><td class="num">'+Number(r.activeUsers||0).toLocaleString()+'</td><td class="num">'+Number(r.newUsers||0).toLocaleString()+'</td><td class="num">'+Number(r.engagedSessions||0).toLocaleString()+'</td><td class="num">'+pct(r.engagementRate)+'</td><td class="num">'+Number(r.engagedSessionsPerActiveUser||0).toFixed(2)+'</td><td class="num">'+fmtTime(r.averageEngagementTimePerActiveUser)+'</td><td class="num">'+Number(r.eventCount||0).toLocaleString()+'</td><td class="num">'+Number(r.keyEvents||0).toFixed(2)+'</td><td class="num">'+pct(r.userKeyEventRate)+'</td><td class="num">'+money(r.totalRevenue)+'</td></tr>'}).join('')||'<tr><td colspan="11">No data</td></tr>')+
      '</tbody></table></div>'+
      '<div class="tdg-ga-table-wrap"><div class="tdg-ga-table-title">Active users by City</div><table class="tdg-ga-table" style="min-width:420px"><thead><tr><th>City</th><th>Active users</th></tr></thead><tbody>'+
      (cities.map(function(r){return '<tr><td>'+esc(r.city)+'</td><td class="num">'+Number(r.activeUsers||0).toLocaleString()+'</td></tr>'}).join('')||'<tr><td colspan="2">No data</td></tr>')+
      '</tbody></table></div>'+
      '<div class="tdg-ga-table-wrap"><div class="tdg-ga-table-title">Pages and screens · Page path and screen class</div><table class="tdg-ga-table" style="min-width:620px"><thead><tr><th>Page path</th><th>Screen class</th><th>Active users</th><th>Views</th></tr></thead><tbody>'+
      (pages.map(function(r){return '<tr><td>'+esc(r.pagePath)+'</td><td>'+esc(r.screenClass)+'</td><td class="num">'+Number(r.activeUsers||0).toLocaleString()+'</td><td class="num">'+Number(r.pageViews||0).toLocaleString()+'</td></tr>'}).join('')||'<tr><td colspan="4">No data</td></tr>')+
      '</tbody></table></div>'+
      (hasData?'<div class="tdg-ga-ok">GA4 data loaded · refreshed every 60 seconds</div>':'<div class="tdg-ga-error">GA4 returned no data for the selected period.</div>')+
      '</div>';
  }
  async function load(){
    const mount=ensureMount();if(!mount)return;
    try{
      const response=await fetch('/api/analytics',{credentials:'same-origin',cache:'no-store'});
      const d=await response.json();
      if(!response.ok||d.error)throw new Error(d.error||('API '+response.status));
      render(d);
    }catch(e){
      const m=ensureMount();if(m)m.innerHTML='<div class="tdg-ga-observability"><div class="tdg-ga-title">OBSERVABILITY</div><div class="tdg-ga-error">Google Analytics could not be loaded: '+htmlEscape(e.message)+'</div></div>';
    }
  }
  function boot(){load();setInterval(load,60000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
`;
    const posFixPatch=String.raw`
<style id="tdg-pos-live-catalog-v2">
/* Live Cashier POS catalog — image-first four-column retail layout. */
.tdg-pos-category-tabs{
  display:flex!important;gap:8px!important;flex-wrap:wrap!important;
  margin:0 0 12px!important
}
.tdg-pos-category-tabs button{
  border:1px solid var(--line)!important;
  background:rgba(255,255,255,.035)!important;
  color:var(--text)!important;
  border-radius:9px!important;
  padding:9px 18px!important;
  font-size:11px!important;
  font-weight:500!important;
  letter-spacing:.02em!important;
  text-transform:none!important;
  cursor:pointer!important;
  min-height:38px!important
}
.tdg-pos-category-tabs button:hover{background:rgba(255,255,255,.08)!important}
.tdg-pos-category-tabs button.active{
  background:rgba(218,196,162,.92)!important;
  border-color:rgba(218,196,162,.95)!important;
  color:#191715!important
}

/* Search stays live; this only refines the catalog presentation. */
#tdgPOSProducts.tdg-pos-live-grid{
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  gap:12px!important;
  align-items:start!important
}
.tdg-pos-live-card{
  min-width:0!important;
  display:flex!important;
  flex-direction:column!important;
  overflow:hidden!important;
  padding:0 0 10px!important;
  border:1px solid var(--line)!important;
  border-radius:12px!important;
  background:rgba(255,255,255,.035)!important;
  color:var(--text)!important
}
.tdg-pos-live-card{cursor:pointer!important}
.tdg-pos-live-card:focus-visible{outline:1px solid rgba(218,196,162,.9)!important;outline-offset:2px}
.tdg-pos-live-card:hover{
  border-color:rgba(255,255,255,.25)!important;
  background:rgba(255,255,255,.055)!important;
  transform:translateY(-1px)
}
.tdg-pos-live-card.tdg-pos-soldout{opacity:.62}
.tdg-pos-live-image{
  position:relative!important;
  width:100%!important;
  aspect-ratio:3/2!important;
  background:rgba(255,255,255,.045)!important;
  border-bottom:1px solid var(--line)!important;
  overflow:hidden!important
}
.tdg-pos-live-image img{
  width:100%!important;height:100%!important;
  object-fit:cover!important;display:block!important
}
.tdg-pos-image-placeholder{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  color:var(--muted);font-size:10px
}
.tdg-pos-live-badge{
  position:absolute!important;left:8px!important;top:8px!important;
  padding:4px 7px!important;border-radius:6px!important;
  background:rgba(32,27,23,.88)!important;border:1px solid rgba(255,255,255,.18)!important;
  color:#ead8bd!important;font-size:8px!important;font-weight:600!important;
  letter-spacing:.08em!important;text-transform:uppercase!important
}
.tdg-pos-live-body{
  display:flex!important;flex-direction:column!important;gap:5px!important;
  padding:10px 10px 0!important;min-height:105px!important
}
.tdg-pos-live-name{
  display:block!important;font-size:12px!important;line-height:1.25!important;
  font-weight:600!important;color:var(--text)!important;
  min-height:30px!important
}
.tdg-pos-live-price{
  font-size:14px!important;line-height:1.1!important;font-weight:600!important
}
.tdg-pos-live-stock{
  font-size:10px!important;line-height:1.2!important;color:var(--muted)!important
}
.tdg-pos-live-stock.tdg-pos-in-stock{color:#8ee6a8!important}
.tdg-pos-live-stock.tdg-pos-sold-label{color:#ff9b9b!important}
.tdg-pos-live-add{
  margin-top:auto!important;width:calc(100% - 20px)!important;margin-left:10px!important;
  border:0!important;border-radius:8px!important;padding:9px 10px!important;
  min-height:36px!important;background:rgba(218,196,162,.92)!important;
  color:#191715!important;font-size:11px!important;font-weight:600!important;
  cursor:pointer!important
}
.tdg-pos-live-add:hover{background:rgba(232,211,179,.98)!important}
.tdg-pos-live-add:disabled{background:rgba(255,255,255,.06)!important;color:var(--muted)!important;cursor:not-allowed!important}
.tdg-pos-product-count{
  margin:0 0 9px!important;font-size:10px!important;color:var(--muted)!important
}
@media(max-width:1180px){#tdgPOSProducts.tdg-pos-live-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:820px){#tdgPOSProducts.tdg-pos-live-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:520px){#tdgPOSProducts.tdg-pos-live-grid{grid-template-columns:1fr!important}}
.tdg-pos-cart-panel{margin-top:12px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:rgba(255,255,255,.025)!important;padding:12px!important}.tdg-pos-cart-title{font-size:10px!important;font-weight:700!important;letter-spacing:.1em!important;margin-bottom:8px!important}.tdg-pos-cart-row,.tdg-pos-cart-total{display:flex!important;justify-content:space-between!important;gap:12px!important;padding:7px 0!important;border-bottom:1px solid rgba(255,255,255,.06)!important;font-size:10px!important}.tdg-pos-cart-total{border-bottom:0!important;padding-top:10px!important;font-size:12px!important}.tdg-pos-cart-empty{font-size:10px!important;color:var(--muted)!important}.tdg-pos-transactions-panel{margin-top:18px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:rgba(255,255,255,.025)!important;overflow:hidden!important}.tdg-pos-transactions-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:13px 14px!important;border-bottom:1px solid var(--line)!important}.tdg-pos-transactions-title{font-size:11px!important;font-weight:700!important;letter-spacing:.12em!important}.tdg-pos-transactions-sub{font-size:9px!important;color:var(--muted)!important;margin-top:3px!important}.tdg-pos-transactions-refresh,.tdg-pos-refund{border:1px solid var(--line)!important;border-radius:7px!important;background:rgba(255,255,255,.05)!important;color:var(--text)!important;padding:7px 10px!important;font-size:10px!important;cursor:pointer!important}.tdg-pos-refund{background:rgba(190,90,90,.12)!important;border-color:rgba(220,120,120,.25)!important}.tdg-pos-transactions-table-wrap{overflow:auto!important}.tdg-pos-transactions-table{width:100%!important;border-collapse:collapse!important;min-width:900px!important;font-size:9px!important}.tdg-pos-transactions-table th,.tdg-pos-transactions-table td{padding:8px 10px!important;border-bottom:1px solid rgba(255,255,255,.06)!important;text-align:left!important;white-space:nowrap!important}.tdg-pos-transactions-table th{font-size:8px!important;color:var(--muted)!important;text-transform:uppercase!important;letter-spacing:.06em!important}.tdg-pos-tx-status.paid{color:#8ee6a8!important}.tdg-pos-tx-status.refunded,.tdg-pos-refunded{color:#ff9b9b!important}.tdg-pos-tx-error{color:#ff9b9b!important}
</style>
<script>
(function(){
  /* POS state must exist before any product button can call tdgAddPOS. */
  if(!Array.isArray(window.tdgPOSProducts))window.tdgPOSProducts=[];
  if(!Array.isArray(window.tdgPOSCart))window.tdgPOSCart=[];
  if(!window.tdgPOSSelectedPayment)window.tdgPOSSelectedPayment="NETS";
  if(typeof window.tdgRenderPOSCart!=="function"){
    window.tdgRenderPOSCart=function(){
      let host=document.getElementById("tdgPOSCurrentSaleItems");
      if(!host){
        const candidates=Array.from(document.querySelectorAll("section,aside,article,div"));
        const hit=candidates.find(function(el){
          const t=String(el.innerText||"").replace(/\\s+/g," ").trim().toUpperCase();
          return t==="CURRENT SALE" || (t.indexOf("CURRENT SALE")>=0 && el.children.length>=2 && t.length<500);
        });
        if(hit){
          host=document.createElement("div");
          host.id="tdgPOSCurrentSaleItems";
          host.className="tdg-pos-current-sale-items";
          hit.appendChild(host);
        }
      }
      if(!host)host=document.getElementById("tdgPOSCartPanel");
      if(!host)return;
      const cart=Array.isArray(window.tdgPOSCart)?window.tdgPOSCart:[];
      if(!cart.length){
        host.innerHTML='<div class="tdg-pos-cart-empty">No items added yet.</div>';
        return;
      }
      const total=cart.reduce(function(n,p){return n+Number(p.price||0)*Number(p.qty||1)},0);
      const qty=cart.reduce(function(n,p){return n+Number(p.qty||0)},0);
      host.innerHTML='<div class="tdg-pos-cart-title">CURRENT SALE · '+qty+' ITEMS</div>'+
        cart.map(function(p){
          const q=Math.max(1,Number(p.qty||1));
          return '<div class="tdg-pos-cart-row"><span>'+htmlEscape(p.name||"Product")+' × '+q+'</span><strong>S$'+(Number(p.price||0)*q).toFixed(2)+'</strong></div>';
        }).join("")+
        '<div class="tdg-pos-cart-total"><span>Total</span><strong>S$'+total.toFixed(2)+'</strong></div>';
    };
  }
  function imageKeyFor(p){
    const a=p&&(Array.isArray(p.images)?p.images:(Array.isArray(p.imgs)?p.imgs:[]));
    return a[0]||p&&(p.image||p.img)||"";
  }
  function imageSrcFor(p){
    const key=imageKeyFor(p);
    if(!key)return "";
    return "/api/product-image?id="+encodeURIComponent(String(key));
  }
  function categoryFor(p){
    return String(p&&(p.category||p.cat||"")||"").toLowerCase();
  }
  function posEsc(v){
    const s=String(v==null?'':v);
    if(typeof htmlEscape==='function')return htmlEscape(s);
    return s.replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
  }
  function posStockFor(p){
    const n=Number(p&&p.qty);
    return Number.isFinite(n)?Math.max(0,n):(p&&p.soldout?0:1);
  }
  function ensureTabs(){
    const box=$("tdgPOSProducts");
    if(!box||!box.parentElement)return;
    let tabs=document.getElementById("tdgPOSCategoryTabs");
    if(!tabs){
      tabs=document.createElement("div");
      tabs.id="tdgPOSCategoryTabs";
      tabs.className="tdg-pos-category-tabs";
      [["all","All"],["men","Men"],["women","Women"],["home","Home"],["perfumes","Perfume"]].forEach(function(c){
        const b=document.createElement("button");
        b.type="button";b.dataset.cat=c[0];b.textContent=c[1];
        b.addEventListener("click",function(){
          window.tdgPOSCategory=c[0];
          tabs.querySelectorAll("button").forEach(function(x){x.classList.remove("active")});
          b.classList.add("active");
          window.tdgRenderPOS();
        });
        tabs.appendChild(b);
      });
      box.parentElement.insertBefore(tabs,box);
    }
    tabs.querySelectorAll("button").forEach(function(b){
      b.classList.toggle("active",b.dataset.cat===(window.tdgPOSCategory||"all"));
    });
  }
  window.tdgRenderPOS=async function(){
    const box=$("tdgPOSProducts");if(!box)return;
    ensureTabs();
    box.classList.add("tdg-pos-live-grid");
    box.innerHTML='<div class="tdg-empty">Loading live products…</div>';
    try{
      const d=await tdgJSON("/api/products");
      const live=Array.isArray(d&&d.data)?d.data:(Array.isArray(d)?d:[]);
      if(!live.length)throw new Error("No products were returned by the live product database.");
      tdgPOSProducts=live;
    }catch(e){
      box.innerHTML='<div class="tdg-empty">Live products could not be loaded: '+posEsc(e.message)+'</div>';
      if(typeof tdgRenderPOSCart==="function")tdgRenderPOSCart();
      return;
    }

    const q=String($("tdgPOSSearch")&&$("tdgPOSSearch").value||"").toLowerCase().trim();
    const cat=window.tdgPOSCategory||"all";
    const rows=tdgPOSProducts.filter(function(p){
      const pc=categoryFor(p);
      const categoryMatch=cat==="all"||pc===cat||(cat==="perfume"&&pc==="perfumes")||(cat==="perfumes"&&pc==="perfume");
      const queryMatch=!q||String(p.name||"").toLowerCase().includes(q)||String(p.id||"").toLowerCase().includes(q);
      return categoryMatch&&queryMatch;
    }).slice(0,100);

    const count=document.getElementById("tdgPOSProductCount");
    if(count)count.textContent="Showing "+rows.length+" of "+tdgPOSProducts.length+" products";

    box.innerHTML=rows.map(function(p){
      const stock=posStockFor(p),sold=stock<=0,image=imageSrcFor(p);
      const id=JSON.stringify(String(p.id)).replace(/</g,"\\\\u003c");
      const safeId=posEsc(String(p.id));
      const badge=p.badge?'<span class="tdg-pos-live-badge">'+posEsc(p.badge)+'</span>':"";
      return '<div class="tdg-pos-live-card'+(sold?" tdg-pos-soldout":"")+'" data-pos-id="'+safeId+'" role="button" tabindex="'+(sold?"-1":"0")+'"'+(sold?' aria-disabled="true"':'')+'>'+
        '<div class="tdg-pos-live-image">'+
          (image?'<img src="'+posEsc(image)+'" alt="'+posEsc(p.name||"Product")+'" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';">':'')+
          badge+
          '<span class="tdg-pos-image-placeholder" style="display:'+(image?"none":"flex")+'">Image unavailable</span>'+
        '</div>'+
        '<div class="tdg-pos-live-body">'+
          '<div class="tdg-pos-live-name">'+posEsc(p.name||"Product")+'</div>'+
          '<div class="tdg-pos-live-price">S$'+Number(p.price||0).toFixed(2)+'</div>'+
          '<div class="tdg-pos-live-stock '+(sold?"tdg-pos-sold-label":"tdg-pos-in-stock")+'">'+(sold?"0 in stock":stock+" in stock")+'</div>'+
        '</div>'+
        '<button type="button" class="tdg-pos-live-add" '+(sold?"disabled":"")+' data-pos-add="'+safeId+'">'+(sold?"Sold Out":"+ Add")+'</button>'+
      '</div>';
    }).join("")||'<div class="tdg-pos-category-empty">No products in this category.</div>';

    if(typeof tdgRenderPOSCart==="function")tdgRenderPOSCart();
    box.querySelectorAll(".tdg-pos-live-card").forEach(function(card){
      if(card.dataset.tdgCardBound==="1")return;
      card.dataset.tdgCardBound="1";
      card.addEventListener("click",function(e){
        if(e.target.closest(".tdg-pos-live-add"))return;
        const id=String(card.dataset.posId||"");
        if(id && card.getAttribute("aria-disabled")!=="true")window.tdgAddPOS(id);
      });
    });
    box.querySelectorAll(".tdg-pos-live-add").forEach(function(btn){
      if(btn.dataset.tdgDirectBound==="1")return;
      btn.dataset.tdgDirectBound="1";
      btn.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        const id=String(btn.dataset.posAdd||"");
        if(id && !btn.disabled)window.tdgAddPOS(id);
      });
    });
  };

  function bindPOSProductClicks(box){ return; }

  window.tdgAddPOS=function(id){
    const p=(Array.isArray(tdgPOSProducts)?tdgPOSProducts:[]).find(function(x){return String(x.id)===String(id)});
    if(!p)return;
    const available=posStockFor(p);
    const cart=Array.isArray(window.tdgPOSCart)?window.tdgPOSCart:(window.tdgPOSCart=[]);
    const existing=cart.find(function(x){return String(x.id)===String(p.id)});
    const current=Number(existing&&existing.qty||0);
    if(available<=0){alert((p.name||"This product")+" is sold out.");return}
    if(current+1>available){alert("Not enough stock for "+(p.name||"this product")+". Only "+available+" available.");return}
    if(existing)existing.qty=current+1;else cart.push(Object.assign({},p,{qty:1}));
    if(typeof window.tdgRenderPOSCart==="function")window.tdgRenderPOSCart();
    window.dispatchEvent(new CustomEvent("tdg:pos-cart-updated",{detail:{product:p,cart:cart}}));
  };


  function ensureTransactionPanel(){
    if(document.getElementById("tdgPOSTransactionsPanel"))return;
    const box=$("tdgPOSProducts"); if(!box||!box.parentElement)return;
    const panel=document.createElement("section");
    panel.id="tdgPOSTransactionsPanel";
    panel.className="tdg-pos-transactions-panel";
    panel.innerHTML='<div class="tdg-pos-transactions-head"><div><div class="tdg-pos-transactions-title">TRANSACTIONS</div><div class="tdg-pos-transactions-sub">Cashier POS sales and refunds</div></div><button type="button" class="tdg-pos-transactions-refresh" onclick="tdgPOSLoadTransactions()">Refresh</button></div><div class="tdg-pos-transactions-table-wrap"><table class="tdg-pos-transactions-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody id="tdgPOSTransactionsBody"><tr><td colspan="8">Loading transactions…</td></tr></tbody></table></div>';
    box.parentElement.insertAdjacentElement("afterend",panel);
    tdgPOSLoadTransactions();
  }
  window.tdgPOSLoadTransactions=async function(){
    const body=document.getElementById("tdgPOSTransactionsBody"); if(!body)return;
    body.innerHTML='<tr><td colspan="8">Loading transactions…</td></tr>';
    try{
      const d=await tdgJSON("/api/orders");
      const rows=Array.isArray(d&&d.data)?d.data:[];
      const pos=rows.filter(function(o){return String(o.delivery_method||"").toUpperCase()==="POS";}).slice(0,100);
      body.innerHTML=pos.length?pos.map(function(o){
        const items=Array.isArray(o.items)?o.items:[];
        const qty=items.reduce(function(n,i){return n+Number(i.qty||0)},0);
        const refunded=String(o.status||"").toUpperCase()==="REFUNDED"||String(o.payment_status||"").toUpperCase()==="REFUNDED";
        const date=o.created_at?new Date(o.created_at).toLocaleString():"—";
        return '<tr><td><strong>'+esc(o.order_number||"—")+'</strong></td><td>'+esc(o.customer_name||"—")+'</td><td>'+qty+'</td><td>'+esc(o.payment_method||"—")+'</td><td>S$'+Number(o.total||0).toFixed(2)+'</td><td><span class="tdg-pos-tx-status '+(refunded?"refunded":"paid")+'">'+esc(o.status||o.payment_status||"—")+'</span></td><td>'+esc(date)+'</td><td>'+(refunded?'<span class="tdg-pos-refunded">Refunded</span>':'<button type="button" class="tdg-pos-refund" onclick="tdgPOSRefund(this.dataset.order)" data-order="'+esc(o.order_number||"")+'">Refund</button>')+'</td></tr>';
      }).join(""):'<tr><td colspan="8">No POS transactions yet.</td></tr>';
    }catch(e){body.innerHTML='<tr><td colspan="8" class="tdg-pos-tx-error">'+esc(e.message||"Could not load transactions")+'</td></tr>';}
  };
  window.tdgPOSRefund=async function(orderNumber){
    if(!orderNumber)return;
    if(!confirm("Refund transaction "+orderNumber+"? The stock will be returned to inventory."))return;
    try{
      const d=await tdgJSON("/api/pos-refund",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_number:String(orderNumber)})});
      alert("Refund completed: "+String(d&&d.data&&d.data.order_number||orderNumber)+" · S$"+Number(d&&d.data&&d.data.refund_total||0).toFixed(2));
      await tdgPOSLoadTransactions();
      await tdgRenderPOS();
    }catch(e){alert("Refund failed: "+e.message);}
  };

  let tdgPOSBooting=false;
  function boot(){
    const box=$("tdgPOSProducts");
    if(!box)return false;
    if(tdgPOSBooting)return true;
    tdgPOSBooting=true;
    ensurePOSCartPanel();
    window.tdgPOSCategory=window.tdgPOSCategory||"all";
    bindPOSProductClicks(box);
    if(box.parentElement&&!document.getElementById("tdgPOSProductCount")){
      const count=document.createElement("div");
      count.id="tdgPOSProductCount";
      count.className="tdg-pos-product-count";
      box.parentElement.insertBefore(count,box);
    }
    window.tdgPOSRefreshProducts=function(){return window.tdgRenderPOS()};
    ensureTransactionPanel();
    Promise.resolve(window.tdgRenderPOS()).finally(function(){tdgPOSBooting=false});
    return true;
  }
  function watchForPOS(){
    if(boot())return;
    const observer=new MutationObserver(function(){
      if(boot()){
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watchForPOS,{once:true});
  else watchForPOS();
})();
</script>`



  const posRefundTopPatch=String.raw`
<style id="tdg-pos-top-refund-style">
.tdg-pos-top-actions{display:inline-flex!important;align-items:center!important;gap:8px!important}
.tdg-pos-top-refund{
  display:inline-flex!important;align-items:center!important;justify-content:center!important;
  border:1px solid rgba(220,120,120,.35)!important;
  border-radius:7px!important;background:rgba(190,90,90,.12)!important;
  color:var(--text)!important;padding:7px 12px!important;font-size:10px!important;
  font-weight:600!important;cursor:pointer!important
}
.tdg-pos-top-refund:hover{background:rgba(190,90,90,.2)!important}
</style>
<script>
(function(){
  function addTopRefund(){
    const buttons=[...document.querySelectorAll('button,a,[role="button"]')];
    const newSale=buttons.find(function(el){
      return /^\\s*New Sale\\s*$/i.test((el.textContent||'').trim());
    });
    if(!newSale)return;
    if(document.getElementById('tdgPOSTopRefund'))return;
    const refund=document.createElement('button');
    refund.type='button';
    refund.id='tdgPOSTopRefund';
    refund.className='tdg-pos-top-refund';
    refund.textContent='Refund';
    refund.title='Open POS transactions and refunds';
    refund.addEventListener('click',function(){
      const panel=document.getElementById('tdgPOSTransactionsPanel');
      if(typeof window.ensureTransactionPanel==='function')window.ensureTransactionPanel();
      const target=document.getElementById('tdgPOSTransactionsPanel');
      if(target){
        target.scrollIntoView({behavior:'smooth',block:'start'});
        if(typeof window.tdgPOSLoadTransactions==='function')window.tdgPOSLoadTransactions();
      }
    });
    const wrap=document.createElement('span');
    wrap.className='tdg-pos-top-actions';
    newSale.parentNode.insertBefore(wrap,newSale);
    wrap.appendChild(newSale);
    wrap.appendChild(refund);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addTopRefund,{once:true});
  else addTopRefund();
  new MutationObserver(function(){addTopRefund()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;
  return html.replace('</body>','<script src="/product-images.js"></script><script src="/product-categories.js"></script>'+kpiCompactPatch+auraPatch+compactPatch+auraContentPatch+topLeftLogoPatch+auraKpiExactPatch+auraKpiMirrorPatch+netsSettlementPatch+auraWordmarkPatch+observabilityPatch+posRefundTopPatch+posFixPatch+'</body>');
}

module.exports=(req,res)=>{
  if(!isAdmin(req)){res.writeHead(302,{Location:'/'});return res.end()}
  const html=fs.readFileSync(path.join(process.cwd(),'public','dashboard.html'),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.status(200).send(injectPOSInventoryLink(html));
};