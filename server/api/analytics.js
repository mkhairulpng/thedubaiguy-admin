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

function metricRow(row,index){ const values=row&&row.metricValues||[]; return Number(values[index]&&values[index].value||0); }
function dim(row,index){ const values=row&&row.dimensionValues||[]; return String(values[index]&&values[index].value||''); }

module.exports=async function handler(req,res){
  if(!requireAdmin(req,res)) return;
  if(req.method!=='GET'){
    res.statusCode=405; res.setHeader('Allow','GET');
    return res.end(JSON.stringify({error:'Method not allowed'}));
  }
  try{
    const property=propertyName();
    const client=new BetaAnalyticsDataClient({credentials:credentials()});
    const range={startDate:'28daysAgo',endDate:'today'};
    const [report,cityReport,pageReport,countryReport]=await Promise.all([
      client.runReport({property,dateRanges:[range],metrics:[{name:'activeUsers'},{name:'newUsers'},{name:'sessions'},{name:'screenPageViews'},{name:'eventCount'},{name:'engagementRate'},{name:'ecommercePurchases'},{name:'totalRevenue'}]}),
      client.runReport({property,dateRanges:[range],dimensions:[{name:'city'}],metrics:[{name:'activeUsers'}],orderBys:[{metric:{metricName:'activeUsers'},desc:true}],limit:25}),
      client.runReport({property,dateRanges:[range],dimensions:[{name:'pagePathPlusQueryString'},{name:'unifiedScreenClass'}],metrics:[{name:'activeUsers'},{name:'screenPageViews'}],orderBys:[{metric:{metricName:'screenPageViews'},desc:true}],limit:25}),
      client.runReport({property,dateRanges:[range],dimensions:[{name:'country'}],metrics:[{name:'activeUsers'},{name:'newUsers'},{name:'engagedSessions'},{name:'engagementRate'},{name:'userEngagementDuration'}],orderBys:[{metric:{metricName:'activeUsers'},desc:true}],limit:25})
    ]);
    let realtimeUsers=0;
    if(typeof client.runRealtimeReport==='function'){
      const [realtime]=await client.runRealtimeReport({property,metrics:[{name:'activeUsers'}]});
      realtimeUsers=metricRow((realtime.rows||[])[0],0);
    }
    const body={
      propertyId:cleanEnv('GA_PROPERTY_ID'),
      measurementId:cleanEnv('GA_MEASUREMENT_ID')||null,
      period:'28days',
      activeUsers:metricRow((report.rows||[])[0],0),
      newUsers:metricRow((report.rows||[])[0],1),
      sessions:metricRow((report.rows||[])[0],2),
      pageViews:metricRow((report.rows||[])[0],3),
      eventCount:metricRow((report.rows||[])[0],4),
      engagementRate:metricRow((report.rows||[])[0],5),
      ecommercePurchases:metricRow((report.rows||[])[0],6),
      totalRevenue:metricRow((report.rows||[])[0],7),
      realtimeUsers,
      activeUsersByCity:(cityReport.rows||[]).map(r=>({city:dim(r,0)||'Unknown',activeUsers:metricRow(r,0)})),
      pagesAndScreens:(pageReport.rows||[]).map(r=>({pagePath:dim(r,0)||'/',screenClass:dim(r,1)||'Unknown',activeUsers:metricRow(r,0),pageViews:metricRow(r,1)})),
      demographicsByCountry:(countryReport.rows||[]).map(r=>{
        const activeUsers=metricRow(r,0), engagedSessions=metricRow(r,2), engagementRate=metricRow(r,3), userEngagementDuration=metricRow(r,4);
        return {country:dim(r,0)||'Unknown',activeUsers,newUsers:metricRow(r,1),engagedSessions,engagementRate,engagedSessionsPerActiveUser:activeUsers?engagedSessions/activeUsers:0,averageEngagementTimePerActiveUser:activeUsers?userEngagementDuration/activeUsers:0};
      }),
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
