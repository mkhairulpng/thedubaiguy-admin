const crypto=require('crypto');
const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
const {getPool,ensureSchema}=require('./_db');

function clean(v){return String(v==null?'':v).trim();}
function normalizeMobile(v){return clean(v).replace(/[^0-9]/g,'');}
function isAuraType(v){const t=clean(v).toUpperCase();return t==='AURA'||t==='AURA MEMBERSHIP';}
function cardNumber(mobile,membershipType){
  const digits=normalizeMobile(mobile);
  if(isAuraType(membershipType)&&digits)return 'AURA'+digits;
  return 'AURA-'+Date.now().toString().slice(-8)+'-'+crypto.randomInt(100,999);
}
async function upsertCustomer(db,b){
  const name=clean(b.name),email=clean(b.email),mobile=normalizeMobile(b.mobile);
  if(!name)return null;
  const existing=await db.query(
    `SELECT id FROM customers WHERE
      (email IS NOT NULL AND email<>'' AND LOWER(email)=LOWER($1))
      OR (mobile IS NOT NULL AND mobile<>'' AND regexp_replace(mobile,'[^0-9]','','g')=$2)
      LIMIT 1`,
    [email,mobile]
  );
  if(existing.rowCount){
    const id=existing.rows[0].id;
    await db.query(
      `UPDATE customers SET name=$1,email=$2,mobile=$3,aura_member=TRUE,updated_at=NOW() WHERE id=$4`,
      [name,email||null,mobile||null,id]
    );
    return id;
  }
  const id=crypto.randomUUID();
  await db.query(
    `INSERT INTO customers(id,name,email,mobile,aura_member) VALUES($1,$2,$3,$4,TRUE)`,
    [id,name,email||null,mobile||null]
  );
  return id;
}

module.exports=async function(req,res){
  cors(req,res);
  if(method(req)==='OPTIONS')return json(res,204,{});
  if(!requireAdmin(req,res))return;
  try{
    await ensureSchema();
    const db=getPool();

    if(method(req)==='GET'){
      const r=await db.query(`SELECT id,name,email,mobile,total_spend,order_count,aura_member,aura_balance,aura_cashback_earned
        FROM customers WHERE aura_member=TRUE OR aura_balance>0 ORDER BY updated_at DESC LIMIT 200`);
      const g=await db.query(`SELECT * FROM aura_giftcards ORDER BY created_at DESC LIMIT 200`);
      return json(res,200,{ok:true,data:r.rows,giftcards:g.rows});
    }

    if(method(req)==='POST'){
      const b=req.body||{};
      const membershipType=clean(b.membership_type)||'AURA';
      const mobile=normalizeMobile(b.mobile);
      if(!clean(b.name))return json(res,400,{error:'Customer name is required'});
      if(isAuraType(membershipType)&&!mobile)return json(res,400,{error:'Mobile number is required for an AURA membership.'});

      const customerId=await upsertCustomer(db,{...b,mobile});
      const balance=Math.max(0,Number(b.balance||0));
      const card=cardNumber(mobile,membershipType);
      const id=crypto.randomUUID();

      if(isAuraType(membershipType)){
        const existing=await db.query(
          `SELECT id,card_number FROM aura_giftcards
           WHERE (membership_type ILIKE 'AURA' OR membership_type ILIKE 'AURA MEMBERSHIP')
             AND customer_mobile=$1 LIMIT 1`,
          [mobile]
        );
        if(existing.rowCount)return json(res,409,{error:'This mobile number already has an AURA membership.',data:{id:existing.rows[0].id,card_number:existing.rows[0].card_number}});
      }

      const exists=await db.query(`SELECT 1 FROM aura_giftcards WHERE card_number=$1`,[card]);
      if(exists.rowCount)return json(res,409,{error:'Membership/card number already exists.'});

      const r=await db.query(
        `INSERT INTO aura_giftcards
        (id,card_number,customer_id,customer_name,customer_email,customer_mobile,balance,initial_balance,status,membership_type,notes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10) RETURNING *`,
        [id,card,customerId,clean(b.name),clean(b.email)||null,mobile||null,balance,clean(b.status)||'ACTIVE',membershipType,clean(b.notes)||null]
      );
      return json(res,201,{ok:true,data:r.rows[0]});
    }

    if(method(req)==='PATCH'){
      const b=req.body||{},id=clean(b.id);
      if(!id)return json(res,400,{error:'id is required'});

      const current=await db.query(`SELECT * FROM aura_giftcards WHERE id=$1 LIMIT 1`,[id]);
      if(!current.rowCount)return json(res,404,{error:'Gift card or membership not found'});
      const old=current.rows[0];

      const name=clean(b.customer_name),email=clean(b.customer_email);
      const mobile=b.customer_mobile===undefined?normalizeMobile(old.customer_mobile):normalizeMobile(b.customer_mobile);
      const status=clean(b.status),type=clean(b.membership_type)||old.membership_type,notes=clean(b.notes);
      const balance=b.balance===undefined?null:Math.max(0,Number(b.balance||0));

      let nextCard=old.card_number;
      if(isAuraType(type)){
        if(!mobile)return json(res,400,{error:'Mobile number is required for an AURA membership.'});
        nextCard=cardNumber(mobile,type);
        const duplicate=await db.query(`SELECT 1 FROM aura_giftcards WHERE card_number=$1 AND id<>$2`,[nextCard,id]);
        if(duplicate.rowCount)return json(res,409,{error:'That mobile number already has an AURA membership.'});
      }

      const r=await db.query(
        `UPDATE aura_giftcards SET
          card_number=$1,
          customer_name=COALESCE(NULLIF($2,''),customer_name),
          customer_email=COALESCE(NULLIF($3,''),customer_email),
          customer_mobile=COALESCE(NULLIF($4,''),customer_mobile),
          status=COALESCE(NULLIF($5,''),status),
          membership_type=COALESCE(NULLIF($6,''),membership_type),
          notes=COALESCE(NULLIF($7,''),notes),
          balance=COALESCE($8,balance),
          updated_at=NOW()
         WHERE id=$9 RETURNING *`,
        [nextCard,name,email,mobile,status,type,notes,balance,id]
      );

      const linkedCustomer=r.rows[0].customer_id;
      if(linkedCustomer){
        await db.query(
          `UPDATE customers SET name=COALESCE(NULLIF($1,''),name),email=COALESCE(NULLIF($2,''),email),mobile=COALESCE(NULLIF($3,''),mobile),aura_member=TRUE,updated_at=NOW() WHERE id=$4`,
          [name,email,mobile,linkedCustomer]
        );
      }
      return json(res,200,{ok:true,data:r.rows[0]});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(e){
    return json(res,e.statusCode||500,{error:e.message||'AURA operation failed'});
  }
};
