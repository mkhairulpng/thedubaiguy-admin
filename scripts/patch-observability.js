const fs=require('fs');
const file='server/api/dashboard.js';
const html=fs.readFileSync(file,'utf8');
const BT=String.fromCharCode(96);
const start=html.indexOf('  const observabilityPatch=String.raw'+BT);
const marker='  return html.replace';
if(start<0) throw new Error('observabilityPatch start not found');
const end=html.indexOf(marker,start);
if(end<0) throw new Error('observabilityPatch end not found');

const patch=String.raw`
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
const replacement='  const observabilityPatch=String.raw'+BT+patch+BT+';';
const out=html.slice(0,start)+replacement+'\n'+html.slice(end);
fs.writeFileSync(file,out);
console.log('patched observabilityPatch');
