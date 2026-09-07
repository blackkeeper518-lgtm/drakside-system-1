from pathlib import Path
p=Path('/home/ubuntu/thai-order-project-vault/server/supabase.ts')
s=p.read_text()
s=s.replace('  items: LiveOrderItem[];\n};', '  items_json?: unknown;\n  items_text?: string | null;\n  items_count?: number | null;\n  total_quantity?: number | null;\n  items: LiveOrderItem[];\n};')
s=s.replace('"cod_check_status", "is_ready_to_pack", "telegram_message", "telegram_copy_text", "telegram_chat_id", "clean_text", "single_cleaned_block", "telegram_body",\n].join(",");\n\nconst itemSelect = [', '"cod_check_status", "is_ready_to_pack", "telegram_message", "telegram_copy_text", "telegram_chat_id", "clean_text", "single_cleaned_block", "telegram_body", "items_json", "items_text", "items_count", "total_quantity", "packer_copy_text", "source_system",\n].join(",");\n\n/* legacy item select intentionally removed: bb_orders is canonical */\nconst itemSelect = [')
start=s.index('const itemSelect = [')
end=s.index('\n\nconst recentOrderCache', start)
s=s[:start]+'const itemSelect = "";'+s[end:]
marker='function normalizeOrder(row: Record<string, unknown>, items: LiveOrderItem[]): LiveOrder {'
helper='''function itemLinesFromOrder(row: Record<string, unknown>): LiveOrderItem[] {\n  const raw = row.items_json;\n  let parsed: unknown[] = [];\n  if (Array.isArray(raw)) parsed = raw;\n  else if (typeof raw === "string") { try { const value = JSON.parse(raw); if (Array.isArray(value)) parsed = value; } catch { /* keep fallback */ } }\n  if (parsed.length) return parsed.filter(item => item && typeof item === "object").map(item => normalizeItem(item as Record<string, unknown>));\n  if (row.sku || row.th_name || row.display_label || row.display_for_packer) return [normalizeItem(row)];\n  return [];\n}\n\n'''
s=s.replace(marker, helper+marker)
s=s.replace('    chat_timeline: timeline(row.chat_timeline ?? bodyField(row, "chat_timeline") ?? row.raw_text_with_phone_timed ?? row.full_chunk_text ?? row.clean_text ?? row.telegram_copy_text ?? row.telegram_message),\n    items,', '    chat_timeline: timeline(row.chat_timeline ?? bodyField(row, "chat_timeline") ?? row.raw_text_with_phone_timed ?? row.full_chunk_text ?? row.clean_text ?? row.telegram_copy_text ?? row.telegram_message),\n    items_json: row.items_json ?? null,\n    items_text: text(row.items_text ?? row.packer_copy_text),\n    items_count: number(row.items_count),\n    total_quantity: number(row.total_quantity),\n    items,')
old='''  const [rawOrders, rawItems] = await Promise.all([\n    getRowsWithFallback<Record<string, unknown>>("bb_orders", "bb_order", orderSelect, 1000),\n    getRows<Record<string, unknown>>("bb_order_items_fix", itemSelect, 3000),\n  ]);\n  const items = rawItems.map(normalizeItem);\n  const itemsByOrder = new Map<string, LiveOrderItem[]>();\n  for (const item of items) {\n    const keys = [item.order_number, item.upsert_key].filter(Boolean) as string[];\n    for (const key of keys) itemsByOrder.set(key, [...(itemsByOrder.get(key) ?? []), item]);\n  }\n\n'''
s=s.replace(old, '  const rawOrders = await getRows<Record<string, unknown>>("bb_orders", orderSelect, 3000);\n')
start=s.index('  const primaryOrderRows = new Map<string, Record<string, unknown>>();')
end=s.index('\n  const query = search?.trim()', start)
replacement='''  const orders = rawOrders.map(row => normalizeOrder(row, itemLinesFromOrder(row))).sort(sortNewest);\n'''
s=s[:start]+replacement+s[end:]
p.write_text(s)
print('migrated')
''
