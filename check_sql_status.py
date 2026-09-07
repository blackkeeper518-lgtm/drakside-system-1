import json, os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

base = os.environ.get('SUPABASE_URL', '').rstrip('/')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
if not base or not key:
    print(json.dumps({'error': 'SUPABASE secrets unavailable'}, ensure_ascii=False))
    raise SystemExit(0)

def check_table(table, select='id'):
    url = f'{base}/rest/v1/{table}?select={select}&limit=1'
    req = Request(url, headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    try:
        with urlopen(req, timeout=15) as res:
            return {'status': res.status, 'ok': True}
    except HTTPError as e:
        return {'status': e.code, 'ok': False, 'detail': e.read().decode('utf-8', 'replace')[:180]}
    except Exception as e:
        return {'status': None, 'ok': False, 'detail': str(e)[:180]}

def check_rpc(name):
    req = Request(f'{base}/rest/v1/rpc/{name}', data=b'{}', method='POST', headers={'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=15) as res:
            return {'status': res.status, 'ok': True}
    except HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:180]
        # A 400 here usually means the function exists but arguments are missing/wrong.
        return {'status': e.code, 'ok': e.code == 400, 'detail': detail}
    except Exception as e:
        return {'status': None, 'ok': False, 'detail': str(e)[:180]}

checks = {
  'bb_orders_canonical_columns': check_table('bb_orders', 'items_json,items_text,items_count,total_quantity,packer_copy_text,source_system'),
  'chat_tables': check_table('chat_customer_messages', 'id'),
  'chat_page_table': check_table('chat_page_messages', 'id'),
  'chat_media_columns': check_table('chat_customer_messages', 'media_status,permanent_image_urls,media_error,media_synced_at'),
  'chat_customer_evidence': check_table('chat_customer_evidence', 'id'),
  'order_performance_rpc': check_rpc('get_latest_orders_for_thread'),
  'media_bucket': check_table('storage.buckets', 'id'),
}
print(json.dumps(checks, ensure_ascii=False, indent=2))
