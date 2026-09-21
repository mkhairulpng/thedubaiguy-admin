const crypto=require('crypto');
const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
const {getPool,ensureSchema}=require('./_db');
const {seedCatalog}=require('./_catalog');

module.exports=async function handler(req,res){
  cors(req,res);
  if(method(req)==='OPTIONS') return json(res,204,{});
  if(!requireAdmin(req,res)) return;
  if(method(req)!=='POST') return json(res,405,{error:'Method not allowed'});

  const b=req.body||{};
  const orderNumber=String(b.order_number||'').trim().toUpperCase();
  if(!orderNumber)return json(res,400,{error:'order_number is required'});

  const db=getPool();
  await ensureSchema();
  await seedCatalog(db);
  const client=await db.connect();

  try{
    await client.query('BEGIN');
    const r=await client.query('SELECT * FROM orders WHERE order_number=$1 FOR UPDATE',[orderNumber]);
    if(!r.rowCount)throw Object.assign(new Error('Transaction not found'),{statusCode:404});
    const order=r.rows[0];
    if(String(order.delivery_method||'').toUpperCase()!=='POS')throw Object.assign(new Error('Only cashier POS transactions can be refunded here'),{statusCode:400});
    if(String(order.status||'').toUpperCase()==='REFUNDED'||String(order.payment_status||'').toUpperCase()==='REFUNDED')throw Object.assign(new Error('This transaction has already been refunded'),{statusCode:409});

    const items=Array.isArray(order.items)?order.items:[];
    for(const item of items){
      const qty=Math.max(1,Number(item.qty||1));
      await client.query('UPDATE products SET qty=qty+$1,soldout=FALSE,updated_at=NOW() WHERE id=$2',[qty,String(item.id)]);
    }

    await client.query(
      'INSERT INTO pos_refunds(id,order_id,order_number,amount,reason,payment_method) VALUES($1,$2,$3,$4,$5,$6)',
      [crypto.randomUUID(),order.id,order.order_number,Number(order.total||0),String(b.reason||'Cashier POS refund'),order.payment_method||null]
    );
    await client.query(
      'UPDATE orders SET status=$1,payment_status=$2,updated_at=NOW() WHERE id=$3',
      ['REFUNDED','REFUNDED',order.id]
    );
    if(order.customer_id){
      await client.query(
        'UPDATE customers SET total_spend=GREATEST(0,total_spend-$1),order_count=GREATEST(0,order_count-1),updated_at=NOW() WHERE id=$2',
        [Number(order.total||0),order.customer_id]
      );
    }
    await client.query('COMMIT');
    return json(res,200,{ok:true,data:{order_number:order.order_number,refund_total:Number(order.total||0),status:'REFUNDED'}});
  }catch(e){
    try{await client.query('ROLLBACK');}catch(_){}
    return json(res,e.statusCode||500,{error:e.message||'Refund failed'});
  }finally{client.release();}
};
