const crypto = require('crypto');
function b64(v){return Buffer.from(v).toString('base64url')}
function sessionKey(password){return crypto.createHash('sha256').update(String(password)).digest('hex')}
function sign(payload,key){return crypto.createHmac('sha256',key).update(payload).digest('base64url')}
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const password=process.env.ADMIN_PASSWORD;
  if(!password) return res.status(503).json({error:'Admin authentication is not configured'});
  let body={}; try{body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})}catch{}
  const supplied=String(body.password||'');
  const a=Buffer.from(supplied), b=Buffer.from(password);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return res.status(401).json({error:'Incorrect password'});
  const payload=b64(JSON.stringify({role:'admin',exp:Date.now()+1000*60*60*12}));
  const token=payload+'.'+sign(payload,sessionKey(password));
  res.setHeader('Set-Cookie','tdg_admin='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200');
  return res.status(200).json({authenticated:true});
};
