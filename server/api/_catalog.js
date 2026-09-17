const catalog = require('../data/products.json');

async function seedCatalog(db) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count > 0) return;
  for (const p of catalog) {
    await db.query(`INSERT INTO products
      (id,name,category,subcategory,price,badge,collection,images,sizes,colors,lede,details,material,qty,soldout,clearance,active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,TRUE)
      ON CONFLICT (id) DO NOTHING`, [
      p.id, p.name, p.cat || null, p.subcat || null, Number(p.price || 0), p.badge || null, p.collection || null,
      JSON.stringify(p.imgs || []), JSON.stringify(p.sizes || []), JSON.stringify(p.colors || []), p.lede || null, p.details || null,
      p.material || null, Number(p.qty || (p.soldout ? 0 : 10)), Boolean(p.soldout), false
    ]);
  }
}

module.exports = { seedCatalog };
