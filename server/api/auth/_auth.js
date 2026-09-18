const crypto=require('crypto');
function sign(p,key){return crypto.createHmac('sha256',key).update(p).digest('base64url')}
function sessionKey(password){return crypto.createHash('sha256').update(String(password)).digest('hex')}
function cookie(req){const m=String(req.headers.cookie||'').match(/(?:^|;\s*)tdg_admin=([^;]+)/);return m?decodeURIComponent(m[1]):''}
function isAdmin(req){const password=process.env.ADMIN_PASSWORD, token=cookie(req);if(!password||!token)return false;try{const [p,s]=token.split('.');if(!p||!s||sign(p,sessionKey(password))!==s)return false;const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.role==='admin'&&d.exp>Date.now()}catch{return false}}
function requireAdmin(req,res){if(!isAdmin(req)){res.status(401).json({error:'Authentication required'});return false}return true}
module.exports={isAdmin,requireAdmin};
