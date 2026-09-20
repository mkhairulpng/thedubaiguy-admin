const {isAdmin}=require('./auth/_auth');

let storefrontHtmlPromise;

function getStorefrontHtml(){
  if(storefrontHtmlPromise)return storefrontHtmlPromise;
  const origin=String(process.env.STOREFRONT_ORIGIN||'https://www.thedubaiguy.shop').replace(/\/$/,'');
  storefrontHtmlPromise=fetch(origin+'/store.html',{redirect:'follow'})
    .then(r=>{if(!r.ok)throw new Error('Storefront image source returned HTTP '+r.status);return r.text()})
    .catch(e=>{storefrontHtmlPromise=null;throw e});
  return storefrontHtmlPromise;
}

function findAsset(html,id){
  const safe=String(id||'').replace(/[^A-Za-z0-9_-]/g,'');
  if(!safe)return null;
  const markers=['"'+safe+'": "','"' + safe + '":"'];
  for(const marker of markers){
    const at=html.indexOf(marker);
    if(at<0)continue;
    const start=at+marker.length;
    const end=html.indexOf('"',start);
    if(end<0)continue;
    const value=html.slice(start,end);
    if(value.startsWith('data:image/'))return value;
  }
  return null;
}

module.exports=async function(req,res){
  if(!isAdmin(req)){res.statusCode=401;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({ok:false,error:'Admin authentication required'}))}
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('Method Not Allowed')}
  const id=String((req.query&&req.query.id)||'').trim();
  if(!id){res.statusCode=400;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({ok:false,error:'Missing image id'}))}
  try{
    const html=await getStorefrontHtml();
    const dataUri=findAsset(html,id);
    if(!dataUri){res.statusCode=404;return res.end('Image not found')}
    const comma=dataUri.indexOf(',');
    const meta=dataUri.slice(5,comma);
    const body=Buffer.from(dataUri.slice(comma+1),'base64');
    const mime=meta.split(';')[0]||'image/jpeg';
    res.statusCode=200;
    res.setHeader('Content-Type',mime);
    res.setHeader('Cache-Control','private, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length',String(body.length));
    return res.end(body);
  }catch(e){
    res.statusCode=502;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.end(JSON.stringify({ok:false,error:e.message||'Unable to load storefront image'}));
  }
};
