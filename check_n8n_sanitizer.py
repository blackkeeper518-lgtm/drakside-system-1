from pathlib import Path
source=Path('/home/ubuntu/thai-order-project-vault/n8n/PRODUCT_MAP_MASTER_SANITIZER.js').read_text()
Path('/tmp/product_map_sanitizer_wrapped.js').write_text('(function(){\n'+source+'\n})();\n')
