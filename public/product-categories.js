(function(){
  "use strict";
  const CATS=[["all","All"],["men","Men"],["women","Women"],["home","Home"],["perfumes","Perfume"]];
  let products=[];
  let active="all";

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]})}
  function catOf(p){const c=String(p&& (p.category||p.cat)||"").toLowerCase(); return c==="perfume"?"perfumes":c}
  function isVisible(el){const r=el.getBoundingClientRect();return r.width>0&&r.height>0}
  async function loadProducts(){
    try{
      const r=await fetch("/api/products",{credentials:"same-origin",cache:"no-store"});
      const d=await r.json();
      products=Array.isArray(d&&d.data)?d.data:(Array.isArray(d)?d:[]);
    }catch(e){products=[]}
  }
  function findProductCards(){
    if(!products.length)return [];
    const names=products.map(p=>({p,name:String(p.name||"").trim().toLowerCase()})).filter(x=>x.name);
    const candidates=[...document.querySelectorAll("article,li,[class*='card' i],[class*='product' i],[class*='item' i],[class*='row' i]")];
    const hits=[];
    for(const {p,name} of names){
      let best=null,bestLen=Infinity;
      for(const el of candidates){
        if(!isVisible(el))continue;
        const t=(el.innerText||"").replace(/\s+/g," ").trim().toLowerCase();
        if(!t.includes(name)||t.length>900)continue;
        if(t.length<bestLen){best=el;bestLen=t.length}
      }
      if(best)hits.push({el:best,p});
    }
    return hits;
  }
  function getHost(){
    const headings=[...document.querySelectorAll("h1,h2,h3,h4,[role='heading'],button,a")];
    const h=headings.find(el=>String(el.textContent||"").trim().toLowerCase()==="products");
    if(!h)return null;
    let parent=h.parentElement;
    for(let i=0;i<5&&parent;i++,parent=parent.parentElement){
      const hits=findProductCardsWithin(parent);
      if(hits.length>=2)return {heading:h,host:parent,hits};
    }
    return {heading:h,host:h.parentElement,hits:findProductCards()};
  }
  function findProductCardsWithin(root){
    if(!products.length)return [];
    const names=products.map(p=>({p,name:String(p.name||"").trim().toLowerCase()})).filter(x=>x.name);
    const candidates=[...root.querySelectorAll("article,li,[class*='card' i],[class*='product' i],[class*='item' i],[class*='row' i]")];
    const hits=[];
    for(const {p,name} of names){
      let best=null,bestLen=Infinity;
      for(const el of candidates){
        if(!isVisible(el))continue;
        const t=(el.innerText||"").replace(/\s+/g," ").trim().toLowerCase();
        if(!t.includes(name)||t.length>900)continue;
        if(t.length<bestLen){best=el;bestLen=t.length}
      }
      if(best)hits.push({el:best,p});
    }
    return hits;
  }
  function renderTabs(target, hits){
    let bar=document.getElementById("tdg-products-category-tabs");
    if(!bar){
      bar=document.createElement("div");
      bar.id="tdg-products-category-tabs";
      bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px;padding:0;";
      (target.heading.parentElement||target.host).insertBefore(bar,target.heading.nextSibling);
    }
    bar.innerHTML="";
    CATS.forEach(([key,label])=>{
      const b=document.createElement("button");
      b.type="button";b.textContent=label;b.dataset.category=key;
      b.style.cssText="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.035);color:inherit;border-radius:9px;padding:9px 16px;font-size:11px;cursor:pointer;";
      if(key===active)b.style.cssText+="background:rgba(218,196,162,.92);color:#191715;border-color:rgba(218,196,162,.95);";
      b.onclick=function(){active=key;apply(hits);renderTabs(target,hits)};
      bar.appendChild(b);
    });
  }
  function apply(hits){
    hits.forEach(({el,p})=>{
      const ok=active==="all"||catOf(p)===active;
      el.style.display=ok?"":"none";
    });
  }
  async function productsPage(){
    const target=getHost();
    if(!target)return;
    const hits=target.hits.length?target.hits:findProductCards();
    if(!hits.length)return;
    renderTabs(target,hits);
    apply(hits);
  }
  async function pos(){
    if(typeof window.tdgRenderPOS!=="function"||!document.getElementById("tdgPOSProducts"))return;
    const original=window.tdgRenderPOS;
    if(original.__tdgCategoryWrapped)return;
    window.tdgRenderPOS=async function(){
      await original();
      const bar=document.getElementById("tdgPOSCategoryTabs");
      if(!bar)return;
      [...bar.querySelectorAll("button")].forEach(b=>{
        if(!CATS.some(c=>c[0]===b.dataset.cat))b.remove();
      });
      if(!bar.querySelector("button[data-cat='home']")){
        const b=document.createElement("button");b.type="button";b.dataset.cat="home";b.textContent="Home";
        b.onclick=function(){window.tdgPOSCategory="home";bar.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));window.tdgRenderPOS()};
        bar.appendChild(b);
      }
      if(!bar.querySelector("button[data-cat='perfumes']")){
        const b=document.createElement("button");b.type="button";b.dataset.cat="perfumes";b.textContent="Perfume";
        b.onclick=function(){window.tdgPOSCategory="perfumes";bar.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));window.tdgRenderPOS()};
        bar.appendChild(b);
      }
      bar.querySelectorAll("button").forEach(b=>b.style.cursor="pointer");
    };
    window.tdgRenderPOS.__tdgCategoryWrapped=true;
  }
  async function boot(){
    await loadProducts();
    await productsPage();
    await pos();
  }
  boot();
  new MutationObserver(function(){productsPage();pos()}).observe(document.documentElement,{subtree:true,childList:true});
})();