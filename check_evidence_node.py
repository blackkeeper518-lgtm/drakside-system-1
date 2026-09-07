from pathlib import Path
source=Path('/home/ubuntu/thai-order-project-vault/n8n/CUSTOMER_CHAT_EVIDENCE_PREPARE.js').read_text()
Path('/tmp/customer_chat_evidence_wrapped.js').write_text('(function(){\n'+source+'\n})();\n')
