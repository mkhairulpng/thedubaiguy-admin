const crypto=require('crypto');
function sign(p,key){return crypto.createHmac('sha256',key).update(p).digest('base64url')}
function sessionKey(password){return crypto.createHash('sha256').update(String(password)).digest('hex')}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}))}
module.exports=async(req,res)=>{
  const password=process.env.ADMIN_PASSWORD,c=cookies(req).tdg_admin;
  if(!password||!c)return res.status(200).json({authenticated:false});
  const [p,s]=c.split('.');
  try{if(!p||!s||sign(p,sessionKey(password))!==s)return res.status(200).json({authenticated:false});const d=JSON.parse(Buffer.from(p,'base64url').toString());return res.status(200).json({authenticated:d.role==='admin'&&d.exp>Date.now()});}catch{return res.status(200).json({authenticated:false})}
};
