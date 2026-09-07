# n8n: Atomic Claim กันส่ง Telegram ซ้ำ

เอกสารนี้ใช้คู่กับ `telegram_delivery_atomic_claim.sql` โดยไม่ต้องแก้ parser หรือเปลี่ยน `Chat ID` เดิม

## โครงสร้างโหนด

```text
โหนดสร้างข้อความ Telegram
  ↓
Code: Prepare Telegram Claim
  ↓
HTTP Request: Claim Telegram Delivery (Supabase RPC)
  ↓
IF: claimed == true
  ├─ false → จบการทำงาน (ออเดอร์นี้ถูกส่งแล้ว หรือมีรอบอื่นกำลังส่ง)
  └─ true  → Telegram Send Message
                 ├─ สำเร็จ → HTTP Request: Mark Telegram Sent
                 └─ error  → HTTP Request: Mark Telegram Failed
```

## 1) Code node: Prepare Telegram Claim

ตั้งเป็น `Run Once for Each Item` และวางโค้ดนี้ โดยให้ `message_id` เป็น ID จาก Facebook/ต้นทางเดิม ห้ามสร้าง ID ใหม่ทุกครั้งที่ workflow รัน

```javascript
const row = $json;
const chatId = String(row.telegram_chat_id ?? '').trim();
const sourceMessageId = String(row.message_id ?? row.id ?? '').trim();

if (!chatId) throw new Error('telegram_chat_id is missing');
if (!sourceMessageId) throw new Error('message_id is missing: cannot safely deduplicate');

const deliveryKey = `telegram:${chatId}:${sourceMessageId}`;
const payloadText = String(row.telegram_message ?? row.telegram_text ?? '');

return {
  json: {
    ...row,
    telegram_delivery_key: deliveryKey,
    telegram_source_message_id: sourceMessageId,
    telegram_payload_hash_input: payloadText,
    telegram_claimed: false,
  },
};
```

ถ้าใช้หลายแชท ให้ใช้ `chat_id + message_id` ตามโค้ดนี้ เพราะออเดอร์เดียวกันอาจถูกส่งคนละห้องได้อย่างถูกต้อง

## 2) HTTP Request: Claim Telegram Delivery

ใช้ credential Supabase เดิมของคุณ แต่ไม่ควรฝัง Bearer token ไว้ใน URL หรือโค้ด

| ค่า | ตั้งค่า |
|---|---|
| Method | `POST` |
| URL | `https://<PROJECT_REF>.supabase.co/rest/v1/rpc/claim_telegram_delivery` |
| Authentication | ใช้ Header Auth credential ที่มีอยู่ |
| Send Body | เปิด |
| Body Content Type | JSON |
| JSON Body | ดูด้านล่าง |

```json
{
  "p_chat_id": "={{ $json.telegram_chat_id }}",
  "p_message_id": "={{ $json.telegram_source_message_id }}",
  "p_order_key": "={{ $json.upsert_key || $json.order_number || null }}",
  "p_payload_hash": "={{ $json.telegram_payload_hash_input }}",
  "p_stale_after": "00:15:00"
}
```

ตั้ง Header เพิ่ม:

```text
Content-Type: application/json
Prefer: return=representation
```

ผลลัพธ์ RPC จะเป็น array หนึ่งแถว เช่น:

```json
[
  {
    "claimed": true,
    "delivery_key": "telegram:-100123:fb_message_456",
    "delivery_status": "SENDING",
    "attempt_count": 1,
    "reason": "CLAIM_GRANTED"
  }
]
```

เพราะ Supabase RPC มักคืนค่าเป็น array ให้ใช้ Code node ถัดไปเพื่อแกะผลลัพธ์:

```javascript
const claim = Array.isArray($json) ? $json[0] : $json;
return {
  json: {
    ...$('Prepare Telegram Claim').item.json,
    ...claim,
    telegram_claimed: claim?.claimed === true,
  },
};
```

ถ้า HTTP node เปิด `Split Into Items` อยู่ ผลลัพธ์อาจเป็น object อยู่แล้ว ให้ใช้ `const claim = $json;` แทน

## 3) IF node: ให้ส่งเฉพาะผู้ที่ได้ claim

เงื่อนไข Boolean:

```text
Value 1: ={{$json.claimed}}
Operation: is true
```

แขนง `false` ให้จบ workflow ได้เลย ไม่ต้องเรียก Telegram เพราะเหตุผลจะเป็นอย่างใดอย่างหนึ่ง:

- `ALREADY_SENT` — ส่งสำเร็จไปแล้ว
- `CLAIMED_BY_OTHER_RUN` — มี workflow รอบอื่นกำลังส่ง

## 4) Telegram Send Message node

ใช้ Telegram node หรือ HTTP Request เดิมที่คุณตั้งค่าไว้แล้ว โดยใช้ข้อมูลเดิมจากรายการ:

```text
chat_id: ={{$json.telegram_chat_id}}
text:    ={{$json.telegram_message}}
parse_mode: HTML
```

อย่าเปลี่ยน `telegram_delivery_key` ระหว่างทาง และอย่าเรียก Telegram ก่อน IF node

## 5) HTTP Request: Mark Telegram Sent

ต่อจาก Telegram node เฉพาะ output ที่ส่งสำเร็จ

| ค่า | ตั้งค่า |
|---|---|
| Method | `POST` |
| URL | `https://<PROJECT_REF>.supabase.co/rest/v1/rpc/mark_telegram_delivery_sent` |
| Body Content Type | JSON |

```json
{
  "p_delivery_key": "={{ $('Claim Telegram Delivery').item.json.delivery_key }}",
  "p_telegram_message_id": "={{ $json.message_id || $json.result?.message_id || null }}"
}
```

ถ้า Telegram node คืนข้อมูลซ้อนต่างจากนี้ ให้ดู field `message_id` จาก execution แล้วปรับเฉพาะ expression นี้

## 6) Error branch: Mark Telegram Failed

เปิด `Continue On Fail` ที่ Telegram node หรือใช้ Error Workflow แล้วเรียก RPC นี้เมื่อทราบแน่ชัดว่าส่งไม่สำเร็จ:

```text
POST https://<PROJECT_REF>.supabase.co/rest/v1/rpc/mark_telegram_delivery_failed
```

```json
{
  "p_delivery_key": "={{ $('Claim Telegram Delivery').item.json.delivery_key }}",
  "p_error": "={{ $json.error?.message || $json.message || 'Telegram send failed' }}"
}
```

สถานะ `FAILED` จะถูก claim ใหม่ได้ในการรันถัดไป

## ตารางสถานะที่แนะนำ

| ฟิลด์ | หน้าที่ |
|---|---|
| `delivery_key` | Primary key รูปแบบ `telegram:<chat_id>:<message_id>` |
| `chat_id` | ห้องปลายทาง |
| `message_id` | ID ออเดอร์/ข้อความต้นทาง |
| `order_key` | อ้างกลับไปที่ `upsert_key` หรือ `order_number` |
| `status` | `PENDING`, `SENDING`, `SENT`, `FAILED` |
| `attempt_count` | จำนวนครั้งที่ได้ claim |
| `telegram_message_id` | ID ข้อความที่ Telegram คืนกลับมา |
| `claimed_at` | เวลาเริ่มถือสิทธิ์ส่ง |
| `sent_at` | เวลาส่งสำเร็จ |
| `last_error` | ข้อผิดพลาดล่าสุด |
| `payload_hash` | เก็บ fingerprint ของข้อความเพื่อ audit |

## พฤติกรรมกรณี workflow ล่ม

ถ้าค้างใน `SENDING` ไม่เกิน 15 นาที รอบใหม่จะไม่ส่งซ้ำ ถ้าค้างเกิน 15 นาที ฟังก์ชันจะถือว่าเป็น claim เก่าและอนุญาตให้ retry ได้

การป้องกันนี้กันการกดรันซ้ำและการรันพร้อมกันได้ดี แต่ Telegram ไม่มี idempotency key ใน `sendMessage` ดังนั้นกรณี Telegram รับข้อความสำเร็จแล้ว n8n ล่มก่อนเรียก `mark_telegram_delivery_sent` ยังมีโอกาสซ้ำที่หายาก หากต้องการเข้มงวดมากขึ้น ให้ใช้ข้อความที่มี `delivery_key` อยู่ในเนื้อหาแล้วค้นหาข้อความเดิมก่อน retry

## ความปลอดภัย

ให้ใช้ Supabase credential/header credential ใน n8n แทนการใส่ Bearer token ตรง ๆ ใน workflow JSON และควร rotate token หากเคยแชร์ workflow ที่มี token ฝังอยู่
