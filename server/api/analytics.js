const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { requireAdmin } = require('./auth/_auth.js');

function fail(message, statusCode=503){ const e=new Error(message); e.statusCode=statusCode; return e; }

function cleanEnv(name){
  const value=process.env[name];
  if(value===undefined || value===null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g,'');
}

function credentials(){
  const clientEmail=cleanEnv('GOOGLE_CLIENT_EMAIL');
  let privateKey=process.env.GOOGLE_PRIVATE_KEY || '';
  if(!clientEmail || !privateKey) throw fail('Google Analytics credentials are not configured in Vercel. Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY (Production).');
  privateKey=String(privateKey).trim().replace(/^['"]|['"]$/g,'');
  privateKey=privateKey.replace(/\\n/g,'\n');
  if(!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) throw fail('GOOGLE_PRIVATE_KEY is present but is not a valid service-account private key. Paste the full private_key value from the Google service-account JSON into Vercel.');
  return {client_email:clientEmail,private_key:privateKey};
}

function propertyName(){
  const id=cleanEnv('GA_PROPERTY_ID');
  if(!/^\d+$/.test(id)) throw fail('GA_PROPERTY_ID is not configured correctly. It must be the numeric GA4 Property ID.');
  return `properties/${id}`;
}

function metric(report,index){
  const values=report && report.rows && report.rows[0] && report.rows[0].metricValues || [];
  return Number(values[index] && values[index].value || 0);
}

module.exports=async function handler(req,res){
  if(!requireAdmin(req,res)) return;
  if(req.method!=='GET'){
    res.statusCode=405; res.setHeader('Allow','GET');
    return res.end(JSON.stringify({error:'Method not allowed'}));
  }
  try{
    const property=propertyName();
    const client=new BetaAnalyticsDataClient({credentials:credentials()});
    const [report]=await client.runReport({
      property,
      dateRanges:[{startDate:'7daysAgo',endDate:'today'}],
      metrics:[
        {name:'activeUsers'},
        {name:'newUsers'},
        {name:'sessions'},
        {name:'screenPageViews'},
        {name:'eventCount'},
        {name:'engagementRate'},
        {name:'ecommercePurchases'},
        {name:'totalRevenue'}
      ]
    });
    let realtimeUsers=0;
    if(typeof client.runRealtimeReport==='function'){
      const [realtime]=await client.runRealtimeReport({property,metrics:[{name:'activeUsers'}]});
      realtimeUsers=metric(realtime,0);
    }
    const body={
      propertyId:cleanEnv('GA_PROPERTY_ID'),
      measurementId:cleanEnv('GA_MEASUREMENT_ID')||null,
      period:'7days',
      activeUsers:metric(report,0),
      newUsers:metric(report,1),
      sessions:metric(report,2),
      pageViews:metric(report,3),
      eventCount:metric(report,4),
      engagementRate:metric(report,5),
      ecommercePurchases:metric(report,6),
      totalRevenue:metric(report,7),
      realtimeUsers,
      source:'Google Analytics Data API'
    };
    res.statusCode=200;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','private, max-age=60');
    return res.end(JSON.stringify(body));
  }catch(error){
    console.error('Google Analytics API error:',error);
    let message=error && error.message || 'Google Analytics request failed';
    if(/PERMISSION_DENIED|permission denied|does not have access|insufficient/i.test(message)){
      message='Google service account can reach the API but does not have access to GA4 Property '+cleanEnv('GA_PROPERTY_ID')+'. In Google Analytics, add the service-account email as Viewer (or higher) on that property.';
    }else if(/UNAUTHENTICATED|invalid_grant|private key|PEM|DECODER/i.test(message)){
      message='Google service-account authentication failed. Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel Production.';
    }else if(/not found|NOT_FOUND/i.test(message)){
      message='GA4 Property '+cleanEnv('GA_PROPERTY_ID')+' was not found or the service account cannot access it. Confirm the numeric Property ID and property access.';
    }
    res.statusCode=error.statusCode||500;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.end(JSON.stringify({error:message,source:'Google Analytics Data API'}));
  }
};
