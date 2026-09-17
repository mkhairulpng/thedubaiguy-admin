const { json, cors, method } = require('./_lib');
const { requireAdmin } = require('./auth/_auth');
const { getPool, ensureSchema } = require('./_db');
const { seedCatalog } = require('./_catalog');

module.exports = async function handler(req,res){
  cors(req,res);
  if (method(req)==='OPTIONS') return json(res,204,{});
  try {
    await ensureSchema(); const db=getPool(); await seedCatalog(db);
    if (method(req)==='GET') {
      const admin = Boolean(req.headers.cookie && req.headers.cookie.includes('tdg_admin='));
      const q=String(req.query?.q||'').trim();
      const result=q ? await db.query(`SELECT * FROM products WHERE active=TRUE AND (LOWER(name) LIKE LOWER($1) OR id ILIKE $1) ORDER BY name`,[`%${q}%`]) : await db.query(`SELECT * FROM products WHERE active=TRUE ORDER BY name`);
      return json(res,200,{ok:true,resource:'products',source:'postgres',data:result.rows,admin});
    }
    if(!requireAdmin(req,res)) return;
    if(method(req)==='PATCH'){
      const id=String(req.body?.id||''); if(!id) return json(res,400,{error:'id is required'});
      const fields=['name','price','badge','collection','qty','soldout','clearance','active','category','subcategory','lede','details','material'];
      const sets=[], vals=[]; for(const f of fields){ if(req.body[f]!==undefined){ sets.push(`${f}=$${vals.length+1}`); vals.push(f==='price'?Number(req.body[f]):req.body[f]); } }
      if(!sets.length) return json(res,400,{error:'No fields to update'});
      sets.push('updated_at=NOW()'); vals.push(id);
      const r=await db.query(`UPDATE products SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING *`,vals);
      return r.rowCount?json(res,200,{ok:true,data:r.rows[0]}):json(res,404,{error:'Product not found'});
    }
    return json(res,405,{error:'Method not allowed'});
  } catch(e){ return json(res,e.statusCode||500,{error:e.message}); }
};
