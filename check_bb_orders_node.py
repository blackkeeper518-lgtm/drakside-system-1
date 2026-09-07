from pathlib import Path
source=Path('/home/ubuntu/thai-order-project-vault/n8n/BB_ORDERS_CANONICAL_PAYLOAD.js').read_text()
Path('/tmp/bb_orders_canonical_wrapped.js').write_text('(function(){\n'+source+'\n})();\n')
