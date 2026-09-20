const {json}=require('./_lib'); const {getPool,ensureSchema}=require('./_db');
module.exports=async(req,res)=>{try{await ensureSchema();await getPool().query('SELECT 1');return json(res,200,{ok:true,version:'255',database:'connected',timestamp:new Date().toISOString()});}catch(e){return json(res,503,{ok:false,version:'254',database:'not-configured',error:e.message});}};
