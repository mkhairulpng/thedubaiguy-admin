const crypto=require('crypto');
const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
const {getPool,ensureSchema}=require('./_db');

function cardNumber(){return 'AURA-'+Date.now().toString().slice(-8)+'-'+crypto.randomInt(100,999);}
function clean(v){return String(v==null?'':v).trim();}
async function upsertCustomer(db,b){
  const name=clean(b.name),email=clean(b.email),mobile=clean(b.mobile);
  if(!name)return null;
  const existing=await db.query(`SELECT id FROM customers WHERE (email IS NOT NULL AND email<>'' AND LOWER(email)=LOWER($1)) OR (mobile IS NOT NULL AND mobile<>'' AND mobile=$2) LIMIT 1`,[email,mobile]);
  if(existing.rowCount){const id=existing.rows[0].id;await db.query(`UPDATE customers SET name=$1,email=$2,mobile=$3,aura_member=TRUE,updated_at=NOW() WHERE id=$4`,[name,email||null,mobile||null,id]);return id;}
  const id=crypto.randomUUID();await db.query(`INSERT INTO customers(id,name,email,mobile,aura_member) VALUES($1,$2,$3,$4,TRUE)`,[id,name,email||null,mobile||null]);return id;
}
module.exports=async function(req,res){
  cors(req,res);if(method(req)==='OPTIONS')return json(res,204,{});if(!requireAdmin(req,res))return;
  try{
    await ensureSchema();const db=getPool();
    if(method(req)==='GET'){
      const r=await db.query(`SELECT id,name,email,mobile,total_spend,order_count,aura_member,aura_balance,aura_cashback_earned FROM customers WHERE aura_member=TRUE OR aura_balance>0 ORDER BY updated_at DESC LIMIT 200`);
      const g=await db.query(`SELECT * FROM aura_giftcards ORDER BY created_at DESC LIMIT 200`);
      return json(res,200,{ok:true,data:r.rows,giftcards:g.rows});
    }
    if(method(req)==='POST'){
      const b=req.body||{},customerId=await upsertCustomer(db,b);if(!customerId)return json(res,400,{error:'Customer name is required'});
      const balance=Math.max(0,Number(b.balance||0)),id=crypto.randomUUID(),card=clean(b.card_number)||cardNumber();
      const exists=await db.query(`SELECT 1 FROM aura_giftcards WHERE card_number=$1`,[card]);if(exists.rowCount)return json(res,409,{error:'Gift card number already exists'});
      const r=await db.query(`INSERT INTO aura_giftcards(id,card_number,customer_id,customer_name,customer_email,customer_mobile,balance,initial_balance,status,membership_type,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10) RETURNING *`,[id,card,customerId,clean(b.name),clean(b.email)||null,clean(b.mobile)||null,balance,clean(b.status)||'ACTIVE',clean(b.membership_type)||'AURA',clean(b.notes)||null]);
      return json(res,201,{ok:true,data:r.rows[0]});
    }
    if(method(req)==='PATCH'){
      const b=req.body||{},id=clean(b.id);if(!id)return json(res,400,{error:'id is required'});
      const name=clean(b.customer_name),email=clean(b.customer_email),mobile=clean(b.customer_mobile),status=clean(b.status),type=clean(b.membership_type),notes=clean(b.notes);
      const balance=b.balance===undefined?null:Math.max(0,Number(b.balance||0));
      const r=await db.query(`UPDATE aura_giftcards SET customer_name=COALESCE(NULLIF($1,''),customer_name),customer_email=COALESCE(NULLIF($2,''),customer_email),customer_mobile=COALESCE(NULLIF($3,''),customer_mobile),status=COALESCE(NULLIF($4,''),status),membership_type=COALESCE(NULLIF($5,''),membership_type),notes=COALESCE(NULLIF($6,''),notes),balance=COALESCE($7,balance),updated_at=NOW() WHERE id=$8 RETURNING *`,[name,email,mobile,status,type,notes,balance,id]);
      return r.rowCount?json(res,200,{ok:true,data:r.rows[0]}):json(res,404,{error:'Gift card not found'});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){return json(res,e.statusCode||500,{error:e.message});}
};