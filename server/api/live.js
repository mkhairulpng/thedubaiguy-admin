const Stripe=require('stripe');
const {json,cors,method}=require('./_lib');
const {requireAdmin}=require('./auth/_auth');
const {getPool,ensureSchema}=require('./_db');

function stripeClient(){
  if(!process.env.STRIPE_SECRET_KEY){
    const e=new Error('Stripe is not configured'); e.statusCode=503; throw e;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function dayBoundsSG(){
  const now=new Date();
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const y=parts.find(x=>x.type==='year').value;
  const m=parts.find(x=>x.type==='month').value;
  const d=parts.find(x=>x.type==='day').value;
  const start=new Date(`${y}-${m}-${d}T00:00:00+08:00`);
  const end=new Date(start.getTime()+86400000);
  return {start,end};
}

async function stripeToday(){
  const stripe=stripeClient();
  const {start,end}=dayBoundsSG();
  const result={configured:true,livemode:null,amount:0,count:0,currency:'sgd',error:null};
  try{
    const bal=await stripe.balance.retrieve();
    result.livemode=Boolean(bal.livemode);
    const sgAvail=(bal.available||[]).find(x=>String(x.currency).toLowerCase()==='sgd');
    const sgPending=(bal.pending||[]).find(x=>String(x.currency).toLowerCase()==='sgd');
    result.available=Number(sgAvail?.amount||0);
    result.pending=Number(sgPending?.amount||0);

    let startingAfter;
    let pages=0;
    do{
      const page=await stripe.paymentIntents.list({
        limit:100,
        created:{gte:Math.floor(start.getTime()/1000),lt:Math.floor(end.getTime()/1000)},
        ...(startingAfter?{starting_after:startingAfter}: {})
      });
      for(const pi of page.data||[]){
        if(pi.status==='succeeded'){
          result.amount+=Number(pi.amount_received||pi.amount||0);
          result.count+=1;
        }
      }
      startingAfter=page.has_more && page.data?.length ? page.data[page.data.length-1].id : null;
      pages++;
    }while(startingAfter&&pages<10);
    return result;
  }catch(e){
    result.error=e.message||'Stripe live data unavailable';
    return result;
  }
}

async function dbToday(){
  const out={configured:Boolean(process.env.DATABASE_URL||process.env.POSTGRES_URL),connected:false,error:null,nets:{amount:0,count:0},paynow:{amount:0,count:0},total:{amount:0,count:0}};
  if(!out.configured){out.error='Database is not configured. Add DATABASE_URL (or POSTGRES_URL) in Vercel Production.';return out;}
  try{
    await ensureSchema();
    const db=getPool();
    const r=await db.query(`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE payment_method='NETS'),0) AS nets_amount,
        COUNT(*) FILTER (WHERE payment_method='NETS') AS nets_count,
        COALESCE(SUM(total) FILTER (WHERE payment_method='PAYNOW'),0) AS paynow_amount,
        COUNT(*) FILTER (WHERE payment_method='PAYNOW') AS paynow_count,
        COALESCE(SUM(total),0) AS total_amount,
        COUNT(*) AS total_count
      FROM orders
      WHERE payment_status='PAID'
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore')
        AND created_at <  (date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore') + interval '1 day'
    `);
    const x=r.rows[0]||{};
    out.connected=true;
    out.nets={amount:Number(x.nets_amount||0),count:Number(x.nets_count||0)};
    out.paynow={amount:Number(x.paynow_amount||0),count:Number(x.paynow_count||0)};
    out.total={amount:Number(x.total_amount||0),count:Number(x.total_count||0)};
    return out;
  }catch(e){
    out.error=e.message||'Database connection failed';
    return out;
  }
}

module.exports=async function(req,res){
  cors(req,res);
  if(method(req)==='OPTIONS')return json(res,204,{});
  if(!requireAdmin(req,res))return;
  if(method(req)!=='GET')return json(res,405,{error:'Method not allowed'});

  const [database,stripe]=await Promise.all([dbToday(),stripeToday().catch(e=>({configured:false,amount:0,count:0,currency:'sgd',error:e.message}))]);
  const webAnalytics={enabled:true,endpoint:'/_vercel/insights/script.js'};
  const speedInsights={enabled:true,endpoint:'/_vercel/speed-insights/script.js'};
  const api={ok:database.connected,code:database.connected?200:503};
  return json(res,200,{
    ok:true,
    checkedAt:new Date().toISOString(),
    api,
    database,
    stripe,
    today:{
      nets:database.nets,
      paynow:database.paynow,
      stripe:{amount:Number(stripe.amount||0)/100,count:Number(stripe.count||0)},
      total:{
        amount:Number(database.nets.amount||0)+Number(database.paynow.amount||0)+Number(stripe.amount||0)/100,
        count:Number(database.nets.count||0)+Number(database.paynow.count||0)+Number(stripe.count||0)
      }
    },
    webAnalytics,
    speedInsights
  });
};
