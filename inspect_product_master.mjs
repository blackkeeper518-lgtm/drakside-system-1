const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('missing Supabase configuration');
const response = await fetch(`${base}/rest/v1/product_master?select=*&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
const body = await response.text();
let parsed = null; try { parsed = JSON.parse(body); } catch {}
console.log(JSON.stringify({ status: response.status, contentRange: response.headers.get('content-range'), columns: Array.isArray(parsed) && parsed[0] ? Object.keys(parsed[0]).sort() : [], error: response.ok ? null : body.slice(0, 400) }, null, 2));
