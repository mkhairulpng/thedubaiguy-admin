const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
module.exports=async function(req,res){
  cors(req,res);if(method(req)==='OPTIONS')return json(res,204,{});if(!requireAdmin(req,res))return;
  if(method(req)!=='POST')return json(res,405,{error:'Method not allowed'});
  const key=process.env.RESEND_API_KEY;
  if(!key)return json(res,503,{error:'RESEND_API_KEY is not configured in Vercel Production.'});
  const b=req.body||{},to=String(b.to||'').trim();
  if(!to)return json(res,400,{error:'Customer email is required'});
  const card=String(b.card_number||'AURA'),name=String(b.name||'Customer'),balance=Number(b.balance||0).toFixed(2);
  const html='<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>TheDubaiGuy AURA</h2><p>Dear '+name+',</p><p>Your AURA membership / gift card is ready.</p><div style="padding:22px;border:1px solid #ddd;border-radius:14px"><div style="font-size:12px;color:#777">CARD NUMBER</div><div style="font-size:22px;font-weight:700;letter-spacing:2px">'+card+'</div><div style="margin-top:18px;font-size:12px;color:#777">BALANCE</div><div style="font-size:28px;font-weight:700">S$'+balance+'</div></div><p>Thank you for choosing TheDubaiGuy.</p></div>';
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from:'TheDubaiGuy <hello@thedubaiguy.shop>',to:[to],subject:'Your TheDubaiGuy AURA Card',html})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return json(res,response.status,{error:data.message||'Email delivery failed'});
  return json(res,200,{ok:true,data});
};