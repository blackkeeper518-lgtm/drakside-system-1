# Vercel backend scaffold

ไฟล์ชุดนี้เป็นโครงสร้างขั้นต่ำสำหรับ Vercel Serverless Functions + tRPC:

```text
api/health.ts
api/trpc/[trpc].ts
server/_core/env.ts
server/_core/trpc.ts
server/_core/index.ts
server/routers.ts
routers.ts
vercel.json
vite.config.ts
tsconfig.json
```

## Local API

```bash
NODE_ENV=development pnpm tsx server/_core/index.ts
```

Health check:

```text
GET /api/health
```

## Vercel

Vercel จะใช้:

```text
Build command: vite build
Output directory: dist
API function: api/trpc/[trpc].ts
```

Environment variables ที่ต้องตั้งใน Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY  # server-only; ห้ามใช้ VITE_ prefix
```

ถ้าใช้หน้าเว็บเรียก tRPC ต้องมี client ที่ชี้ไป:

```text
/api/trpc
```

## ข้อจำกัดของ scaffold นี้

Router ที่ให้มาเป็น adapter ขั้นต้นสำหรับ endpoint ที่หน้า `ChatHub.tsx` เรียก และใช้ Supabase REST บางตาราง/view ที่ต้องมีจริงก่อนใช้งาน:

```text
vw_chat_threads
vw_payload_room_status
chat_customer_evidence
chat_customer_messages
vw_room_delivery_pending
```

`sendReply` และ `uploadImage` ยังคืนสถานะ `not_configured` เพื่อไม่ส่งข้อมูลออกจริงจนกว่าจะเชื่อม Meta API และ storage อย่างปลอดภัย

ก่อน production ต้องตรวจ:

1. ชื่อตาราง/view จริงใน Supabase
2. auth ของ tRPC และสิทธิ์ผู้ใช้
3. Meta send API
4. upload storage
5. CORS/cookie/session
6. การไม่เปิด service-role key ใน browser
7. build ของหน้าเว็บ เพราะ repository เดิมยังมี import บางชุดที่อาจอยู่นอก snapshot นี้
