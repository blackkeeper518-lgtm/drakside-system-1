from pathlib import Path
files = [
    '/home/ubuntu/thai-order-project-vault/n8n/HERMES_MEDIA_PREPARE.js',
    '/home/ubuntu/thai-order-project-vault/n8n/HERMES_MEDIA_PATCH_BUILD.js',
    '/home/ubuntu/thai-order-project-vault/n8n/CUSTOMER_CHAT_PROCESSOR.js',
    '/home/ubuntu/thai-order-project-vault/n8n/PAGE_CHAT_PROCESSOR.js',
]
for filename in files:
    source = Path(filename).read_text()
    wrapped = Path('/tmp') / (Path(filename).stem + '.wrapped.js')
    wrapped.write_text('(function(){\n' + source + '\n})();\n')
print('prepared', len(files), 'n8n wrappers')
