from pathlib import Path
files=['PRODUCT_MASTER_FIELDS_ONLY.js','STOCK_WARNING_NODE.js','PRODUCT_MAPPING_WARNING_NODE.js']
for name in files:
    source=Path('/home/ubuntu/thai-order-project-vault/n8n/'+name).read_text()
    Path('/tmp/'+name.replace('.js','.wrapped.js')).write_text('(function(){\n'+source+'\n})();\n')
