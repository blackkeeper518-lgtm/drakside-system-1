const fs = require('fs');
const source = fs.readFileSync('/home/ubuntu/thai-order-project-vault/n8n/CUSTOMER_CHAT_EVIDENCE_PREPARE.js', 'utf8');
fs.writeFileSync('/tmp/customer_evidence_wrapped.js', `(function(){\n${source}\n})();\n`);
