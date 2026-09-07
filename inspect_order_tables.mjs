const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unavailable');
const expected = ['id','upsert_key','order_number','order_date','order_time','created_at','updated_at','customer_name','facebook_name','phone','full_address','address_display_packer','page_name','page_id','thread_id','threadId','cod_amount','expected_cod','sku','th_name','emoji','label_display','display_for_packer','telegram_status','order_status','audit_status','audit_flags','cod_check_status','is_ready_to_pack','telegram_message','telegram_copy_text','telegram_chat_id','clean_text','single_cleaned_block','telegram_body'];
for (const table of ['bb_order','bb_orders']) {
  const url = `${base}/rest/v1/${table}?select=*&limit=1`;
  const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' } });
  const body = await response.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = null; }
  const actual = Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object' ? Object.keys(parsed[0]) : [];
  const missing = expected.filter(column => !actual.includes(column));
  console.log(JSON.stringify({ table, status: response.status, contentRange: response.headers.get('content-range'), columns: actual.sort(), missingExpected: missing, error: response.ok ? null : body.slice(0, 500) }, null, 2));
}
