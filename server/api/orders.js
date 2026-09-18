const crypto=require('crypto');
const { json, cors, method }=require('./_lib');
const { requireAdmin }=require('./auth/_auth');
const { getPool, ensureSchema }=require('./_db');
const { seedCatalog }=require('./_catalog');

function orderNumber(){ return `TDG-${Date.now().toString().slice(-8)}-${crypto.randomInt(100,999)}`; }
function cleanItem(i){ return {id:String(i.id||''),qty:Math.max(1,Math.min(99,Number(i.qty||1))),size:i.size?String(i.size):'',color:i.color?String(i.color):''}; }

module.exports=async function handler(req,res){
  cors(req,res); if(method(req)==='OPTIONS') return json(res,204,{});
  try{ await ensureSchema(); const db=getPool(); await seedCatalog(db);
    if(method(req)==='GET'){
      const number=String(req.query?.order_number||'').trim().toUpperCase();
      if(number){ const r=await db.query(`SELECT order_number,status,payment_status,total,currency,delivery_method,lalamove_order_id,lalamove_status,created_at,paid_at,updated_at FROM orders WHERE order_number=$1`,[number]); return r.rowCount?json(res,200,{ok:true,data:r.rows[0]}):json(res,404,{error:'Order not found'}); }
      if(!requireAdmin(req,res)) return;
      const r=await db.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`); return json(res,200,{ok:true,data:r.rows});
    }
    if(method(req)==='POST'){
      const b=req.body||{}; const items=(Array.isArray(b.items)?b.items:[]).map(cleanItem).filter(x=>x.id);
      if(!b.customer?.name || !items.length) return json(res,400,{error:'Customer name and at least one item are required'});
      const ids=[...new Set(items.map(i=>i.id))]; const pr=await db.query(`SELECT * FROM products WHERE id=ANY($1::text[]) AND active=TRUE`,[ids]);
      if(pr.rows.length!==ids.length) return json(res,400,{error:'One or more products are unavailable'});
      const map=new Map(pr.rows.map(p=>[p.id,p])); let subtotal=0;
      const priced=items.map(i=>{const p=map.get(i.id); if(Number(p.qty)<i.qty) throw Object.assign(new Error(`${p.name} does not have enough stock.`),{statusCode:409}); const color=p.colors?.find(c=>c.name===i.color); const unit=Number(color?.price ?? p.price); subtotal+=unit*i.qty; return {...i,name:p.name,unit_price:unit};});
      const shipping=subtotal>=200?0:12; const total=subtotal+shipping; const c=b.customer;
      const existing=await db.query(`SELECT * FROM customers WHERE (email IS NOT NULL AND email<>'' AND LOWER(email)=LOWER($1)) OR (mobile IS NOT NULL AND mobile<>'' AND mobile=$2) LIMIT 1`,[c.email||'',c.mobile||'']);
      const customerId=existing.rowCount?existing.rows[0].id:crypto.randomUUID();
      if(!existing.rowCount) await db.query(`INSERT INTO customers(id,name,email,mobile,address,postal,country) VALUES($1,$2,$3,$4,$5,$6,$7)`,[customerId,c.name,c.email||null,c.mobile||null,c.address||null,c.postal||null,c.country||'Singapore']);
      const id=crypto.randomUUID(), num=orderNumber();
      await db.query(`INSERT INTO orders(id,order_number,status,payment_status,customer_id,customer_name,customer_email,customer_mobile,address,postal,country,subtotal,shipping,total,payment_method,delivery_method,items) VALUES($1,$2,'PENDING_PAYMENT','PENDING',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)`,[id,num,customerId,c.name,c.email||null,c.mobile||null,c.address||null,c.postal||null,c.country||'Singapore',subtotal,shipping,total,b.payment_method||null,b.delivery_method||null,JSON.stringify(priced)]);
      return json(res,201,{ok:true,data:{id,order_number:num,subtotal,shipping,total,currency:'SGD',items:priced}});
    }
    if(method(req)==='PATCH'){
      if(!requireAdmin(req,res)) return; const b=req.body||{}; if(!b.order_number) return json(res,400,{error:'order_number is required'});
      const sets=[]; const vals=[]; for(const f of ['status','delivery_method','lalamove_status','lalamove_order_id']) if(b[f]!==undefined){sets.push(`${f}=$${vals.length+1}`);vals.push(b[f]);} sets.push('updated_at=NOW()'); vals.push(String(b.order_number).toUpperCase());
      const r=await db.query(`UPDATE orders SET ${sets.join(',')} WHERE order_number=$${vals.length} RETURNING *`,vals); return r.rowCount?json(res,200,{ok:true,data:r.rows[0]}):json(res,404,{error:'Order not found'});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){return json(res,e.statusCode||500,{error:e.message});}
};
