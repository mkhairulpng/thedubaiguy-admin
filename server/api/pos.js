const crypto=require('crypto');
const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
const {getPool,ensureSchema}=require('./_db');
const {seedCatalog}=require('./_catalog');

function orderNumber(){return `TDG-${Date.now().toString().slice(-8)}-${crypto.randomInt(100,999)}`;}
function cleanItem(i){return {id:String(i.id||''),qty:Math.max(1,Math.min(99,Number(i.qty||1))),size:i.size?String(i.size):'',color:i.color?String(i.color):''};}

module.exports=async function handler(req,res){
  cors(req,res);
  if(method(req)==='OPTIONS') return json(res,204,{});
  if(!requireAdmin(req,res)) return;
  if(method(req)!=='POST') return json(res,405,{error:'Method not allowed'});

  const b=req.body||{};
  const payment=String(b.payment_method||'').toUpperCase();
  if(!['NETS','PAYNOW','STRIPE'].includes(payment)) return json(res,400,{error:'Invalid payment method'});
  const c=b.customer||{};
  const name=String(c.name||'').trim();
  const mobile=String(c.mobile||'').trim();
  if(!name) return json(res,400,{error:'Customer name is required'});

  const items=(Array.isArray(b.items)?b.items:[]).map(cleanItem).filter(x=>x.id);
  if(!items.length) return json(res,400,{error:'At least one product is required'});

  const db=getPool();
  await ensureSchema();
  await seedCatalog(db);
  const client=await db.connect();

  try{
    await client.query('BEGIN');

    const ids=[...new Set(items.map(i=>i.id))];
    const pr=await client.query(`SELECT * FROM products WHERE id=ANY($1::text[]) AND active=TRUE FOR UPDATE`,[ids]);
    if(pr.rows.length!==ids.length) throw Object.assign(new Error('One or more products are unavailable'),{statusCode:400});
    const map=new Map(pr.rows.map(p=>[p.id,p]));
    let subtotal=0;

    const priced=items.map(i=>{
      const p=map.get(i.id);
      const qty=Number(p.qty||0);
      if(qty<i.qty) throw Object.assign(new Error(`${p.name} does not have enough stock.`),{statusCode:409});
      const color=Array.isArray(p.colors)?p.colors.find(x=>x.name===i.color):null;
      const unit=Number(color?.price ?? p.price ?? 0);
      subtotal+=unit*i.qty;
      return {...i,name:p.name,unit_price:unit};
    });

    const existing=await client.query(
      `SELECT * FROM customers WHERE (mobile IS NOT NULL AND mobile<>'' AND mobile=$1) LIMIT 1`,
      [mobile]
    );
    const customerId=existing.rowCount?existing.rows[0].id:crypto.randomUUID();

    if(!existing.rowCount){
      await client.query(
        `INSERT INTO customers(id,name,mobile,country) VALUES($1,$2,$3,'Singapore')`,
        [customerId,name,mobile||null]
      );
    }else{
      await client.query(
        `UPDATE customers SET name=$1,updated_at=NOW() WHERE id=$2`,
        [name,customerId]
      );
    }

    const orderId=crypto.randomUUID();
    const num=orderNumber();

    await client.query(
      `INSERT INTO orders(
        id,order_number,status,payment_status,customer_id,customer_name,customer_mobile,
        subtotal,shipping,total,currency,payment_method,delivery_method,items,paid_at
      ) VALUES($1,$2,'PAID','PAID',$3,$4,$5,$6,0,$7,'SGD',$8,'POS',$9::jsonb,NOW())`,
      [orderId,num,customerId,name,mobile||null,subtotal,subtotal,payment,JSON.stringify(priced)]
    );

    for(const item of priced){
      await client.query(
        `UPDATE products SET qty=qty-$1, soldout=(qty-$1)<=0, updated_at=NOW() WHERE id=$2`,
        [item.qty,item.id]
      );
    }

    const spend=Number(subtotal);
    await client.query(
      `UPDATE customers
       SET total_spend=total_spend+$1,
           order_count=order_count+1,
           updated_at=NOW()
       WHERE id=$2`,
      [spend,customerId]
    );

    await client.query('COMMIT');
    return json(res,201,{ok:true,data:{
      id:orderId,order_number:num,total:subtotal,currency:'SGD',
      payment_method:payment,status:'PAID'
    }});
  }catch(e){
    try{await client.query('ROLLBACK');}catch(_){}
    return json(res,e.statusCode||500,{error:e.message||'POS sale failed'});
  }finally{client.release();}
};
