const Stripe=require('stripe');
const {json}=require('../_lib');
const {requireAdmin}=require('../auth/_auth');
const {getPool,ensureSchema}=require('../_db');

function client(){
  if(!process.env.STRIPE_SECRET_KEY){const e=new Error('Stripe is not configured');e.statusCode=503;throw e;}
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

module.exports=async function(req,res){
  const route=String(req.query.route||'').replace(/^\/+|\/+$/g,'');
  try{
    if(req.method==='GET'&&route==='payment-summary'){
      if(!requireAdmin(req,res))return;
      const stripe=client();
      const tz='Asia/Singapore';
      const now=new Date();
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
      const getPart=k=>parts.find(x=>x.type===k)?.value;
      const dayKey=getPart('year')+'-'+getPart('month')+'-'+getPart('day');
      const dayStart=new Date(dayKey+'T00:00:00+08:00');
      const dayEnd=new Date(dayStart.getTime()+86400000);
      const stripeData=await stripe.paymentIntents.list({
        limit:100,
        created:{gte:Math.floor(dayStart.getTime()/1000),lt:Math.floor(dayEnd.getTime()/1000)}
      });
      const stripePaid=(stripeData.data||[]).filter(p=>p.status==='succeeded');
      const stripeAmount=stripePaid.reduce((sum,p)=>sum+Number(p.amount_received||p.amount||0)/100,0);
      let nets={amount:0,count:0},paynow={amount:0,count:0},dbConfigured=Boolean(process.env.DATABASE_URL||process.env.POSTGRES_URL),dbError=null;
      if(dbConfigured){
        try{
          await ensureSchema();
          const db=getPool();
          const r=await db.query(`
            SELECT
              COALESCE(SUM(total) FILTER (WHERE payment_method='NETS'),0) AS nets_amount,
              COUNT(*) FILTER (WHERE payment_method='NETS') AS nets_count,
              COALESCE(SUM(total) FILTER (WHERE payment_method='PAYNOW'),0) AS paynow_amount,
              COUNT(*) FILTER (WHERE payment_method='PAYNOW') AS paynow_count
            FROM orders
            WHERE payment_status='PAID'
              AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore')
              AND created_at <  (date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore') + interval '1 day'
          `);
          const x=r.rows[0]||{};
          nets={amount:Number(x.nets_amount||0),count:Number(x.nets_count||0)};
          paynow={amount:Number(x.paynow_amount||0),count:Number(x.paynow_count||0)};
        }catch(e){dbError=e.message||'Database unavailable';}
      }else{
        dbError='Database is not configured. Add DATABASE_URL (or POSTGRES_URL) in Vercel Production.';
      }
      const balance=await stripe.balance.retrieve();
      const payouts=await stripe.payouts.list({limit:5});
      const available=(balance.available||[]).reduce((n,x)=>n+Number(x.amount||0)/100,0);
      const pending=(balance.pending||[]).reduce((n,x)=>n+Number(x.amount||0)/100,0);
      return json(res,200,{ok:true,databaseConfigured:dbConfigured,databaseError:dbError,timeZone:tz,businessDate:dayKey,
        total:Number(nets.amount)+Number(paynow.amount)+Number(stripeAmount),count:nets.count+paynow.count+stripePaid.length,
        nets,paynow,
        stripe:{amount:Number(stripeAmount),count:stripePaid.length,source:'Stripe PaymentIntents',available,pending,currency:'SGD'},
        balance:{available:balance.available||[],pending:balance.pending||[]},
        payouts:payouts.data||[]});
    }

    const stripe=client();
    if(req.method==='POST'&&route==='checkout-session'){
      await ensureSchema();const db=getPool();const orderId=String(req.body?.order_id||'');
      if(!orderId)return json(res,400,{error:'order_id is required'});
      const r=await db.query(`SELECT * FROM orders WHERE id=$1`,[orderId]);
      if(!r.rowCount)return json(res,404,{error:'Order not found'});
      const o=r.rows[0];if(o.payment_status!=='PENDING')return json(res,409,{error:'Order is not payable'});
      const items=Array.isArray(o.items)?o.items:[];const line_items=items.map(i=>({price_data:{currency:'sgd',product_data:{name:i.name,metadata:{product_id:i.id,size:i.size||'',color:i.color||'',order_id:o.order_number}},unit_amount:Math.round(Number(i.unit_price)*100)},quantity:Number(i.qty)}));
      if(Number(o.shipping)>0)line_items.push({price_data:{currency:'sgd',product_data:{name:'Delivery'},unit_amount:Math.round(Number(o.shipping)*100)},quantity:1});
      const session=await stripe.checkout.sessions.create({mode:'payment',line_items,customer_email:o.customer_email||undefined,success_url:`https://www.thedubaiguy.shop/#/confirmation?session_id={CHECKOUT_SESSION_ID}&order=${encodeURIComponent(o.order_number)}`,cancel_url:'https://www.thedubaiguy.shop/#/checkout',metadata:{order_id:o.id,order_number:o.order_number}});
      await db.query(`UPDATE orders SET stripe_session_id=$1,updated_at=NOW() WHERE id=$2`,[session.id,o.id]);return json(res,200,session);
    }
    if(req.method==='GET'&&route==='balance'){if(!requireAdmin(req,res))return;return json(res,200,await stripe.balance.retrieve());}
    if(req.method==='GET'&&route==='payouts'){if(!requireAdmin(req,res))return;return json(res,200,await stripe.payouts.list({limit:Math.min(Number(req.query.limit||10),100)}));}
    if(req.method==='GET'&&route==='transactions'){if(!requireAdmin(req,res))return;return json(res,200,await stripe.balanceTransactions.list({limit:Math.min(Number(req.query.limit||25),100)}));}
    if(req.method==='GET'&&route==='summary'){if(!requireAdmin(req,res))return;const [balance,payouts]=await Promise.all([stripe.balance.retrieve(),stripe.payouts.list({limit:5})]);return json(res,200,{available:balance.available,pending:balance.pending,payouts:payouts.data});}
    if(req.method==='GET'&&route==='products'){if(!requireAdmin(req,res))return;return json(res,200,await stripe.products.list({active:true,limit:100}));}
    if(req.method==='POST'&&route==='refund'){if(!requireAdmin(req,res))return;const b=req.body||{};if(!b.payment_intent&&!b.charge)return json(res,400,{error:'payment_intent or charge is required'});return json(res,200,await stripe.refunds.create({payment_intent:b.payment_intent,charge:b.charge,amount:b.amount,reason:b.reason}));}
    return json(res,404,{error:'Unknown Stripe route',route});
  }catch(e){return json(res,e.statusCode||500,{error:e.message,code:e.code||'STRIPE_ERROR'});}
};
