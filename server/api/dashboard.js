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
  const kpiCompactPatch=String.raw\`
<style id="tdg-kpi-compact-exact">
.tdg-kpi-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px!important;width:100%!important}
.tdg-kpi-compact-card{position:relative!important;box-sizing:border-box!important;min-width:0!important;height:150px!important;padding:18px 20px!important;border-radius:16px!important;overflow:hidden!important;display:block!important;background:rgba(28,29,30,.92)!important;border:1px solid rgba(255,255,255,.13)!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important}
.tdg-kpi-compact-card .tdg-kpi-title{position:absolute!important;left:20px!important;top:17px!important;font-size:14px!important;line-height:1.2!important;font-weight:500!important;color:rgba(255,255,255,.72)!important;margin:0!important}
.tdg-kpi-compact-card .tdg-kpi-value{position:absolute!important;left:20px!important;top:48px!important;font-size:34px!important;line-height:1.05!important;font-weight:500!important;letter-spacing:-.025em!important;color:#fff!important;margin:0!important}
.tdg-kpi-compact-card .tdg-kpi-sub{position:absolute!important;left:20px!important;bottom:18px!important;font-size:13px!important;line-height:1.2!important;color:rgba(255,255,255,.58)!important;margin:0!important}
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
})();
</script>\`;
  return html.replace('</body>',kpiCompactPatch+patch+auraPatch+compactPatch+auraContentPatch+topLeftLogoPatch+auraKpiExactPatch+auraKpiMirrorPatch+netsSettlementPatch+'</body>');
}

module.exports=(req,res)=>{
  if(!isAdmin(req)){res.writeHead(302,{Location:'/'});return res.end()}
  const html=fs.readFileSync(path.join(process.cwd(),'public','dashboard.html'),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.status(200).send(injectPOSInventoryLink(html));
};
