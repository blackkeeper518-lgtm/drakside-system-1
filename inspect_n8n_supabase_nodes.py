import json
p='/home/ubuntu/thai-order-project-vault/n8n/thai-order-chat-branch-added.json'
d=json.load(open(p))
for n in d.get('nodes',[]):
    s=json.dumps(n,ensure_ascii=False)
    if any(x in s.lower() for x in ['product_map_master','bb_order']):
        params=n.get('parameters',{})
        print(json.dumps({'name':n.get('name'),'type':n.get('type'),'url':params.get('url'),'method':params.get('method'),'hasAuth':bool(n.get('credentials')),'bodyKeys':list(params.keys())},ensure_ascii=False))
