from pathlib import Path
source = Path('/home/ubuntu/thai-order-project-vault/n8n/BB_ORDERS_CANONICAL_PAYLOAD.js').read_text()
Path('/tmp/upsert_payload_wrapped.js').write_text('(function(){\n' + source + '\n})();\n')
