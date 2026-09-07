from pathlib import Path
for name in ['PRODUCT_MASTER_BRANCH_PREPARE.js']:
 s=Path('/home/ubuntu/thai-order-project-vault/n8n/'+name).read_text();Path('/tmp/'+name+'.wrapped.js').write_text('(function(){\n'+s+'\n})();\n')
