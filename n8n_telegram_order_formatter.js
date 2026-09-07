// ============================================================
// FULL CODE สำหรับ n8n: Telegram ออเดอร์สำหรับคนแพ็ก
// ตั้งค่า Code node เป็น JavaScript / Run Once for All Items
// ============================================================

const CHAT_ID = 'REPLACE_WITH_TELEGRAM_CHAT_ID';
const inputItems = $input.all();


function value(row, key) {
  const v = row?.[key];
  return v === undefined || v === null ? '' : String(v).trim();
}

function firstExisting(row, keys) {
  for (const key of keys) {
    const v = value(row, key);
    if (v !== '') return v;
  }
  return '';
}

function escapeHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseNumber(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const cleaned = String(v).replaceAll(',', '').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function money(v) {
  const n = parseNumber(v);
  if (n === null) return String(v ?? '').trim();
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// แสดงวันที่เพียงค่าเดียว โดยเลือกเวลาที่ละเอียดจาก order_time ก่อน
function getOneOrderDate(row) {
  return firstExisting(row, ['order_time', 'order_date', 'created_at']);
}

// ดึงจำนวนจากข้อความสั้นที่ติดกับสินค้า เช่น "ม่อนเขียว 4" หรือ "วอคเขียว 1"
function quantityFromProductText(text) {
  const s = String(text ?? '').trim();
  if (!s) return '';

  // กรณีมีหน่วยต่อท้าย: "Voxx เขียว 1 คอต"
  let match = s.match(/(\d+(?:\.\d+)?)\s*(?:คอต|คอตตอน|carton|กล่อง|ชิ้น)?\s*$/i);
  if (match) return match[1];

  return '';
}

function normalizeForSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[|()\[\]{}:：,，._-]/g, '');
}

function getRawOrderBlock(row) {
  return firstExisting(row, [
    'single_cleaned_block',
    'sniper_x_text_clean',
    'clean_text',
    'raw_message',
    'message_text',
    'order_text',
  ]);
}

function getProductQuantity(row) {
  const rawOrder = getRawOrderBlock(row);
  const sku = value(row, 'sku');
  const thaiName = firstExisting(row, ['th_name', 'thName', 'product_th_name']);
  const aliases = [
    value(row, 'alias'),
    value(row, 'alias_norm'),
    value(row, 'display_for_packer'),
    value(row, 'packer_display_text'),
    sku,
    thaiName,
  ].filter(Boolean);

  // ดึงจากบรรทัด/ก้อนข้อความดิบที่มีชื่อสินค้าติดอยู่เท่านั้น
  if (rawOrder) {
    const rawLines = rawOrder.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of rawLines) {
      const lineNorm = normalizeForSearch(line);
      const matchesProduct = aliases.some((alias) => {
        const aliasNorm = normalizeForSearch(alias).replace(/\d+(?:\.\d+)?$/, '');
        return aliasNorm && lineNorm.includes(aliasNorm);
      });
      if (matchesProduct) {
        const qty = quantityFromProductText(line);
        if (qty !== '') return qty;
      }
    }
  }

  // กรณี alias เป็นก้อนสินค้าที่โหนดหน้าสุดสร้างไว้แล้ว
  for (const alias of aliases) {
    const qty = quantityFromProductText(alias);
    if (qty !== '') return qty;
  }

  // ไม่ใช้ quantity/extracted_qty เป็นค่าเดา หากไม่พบเลขจากข้อความสินค้า
  return '';
}

function splitAddress(row) {
  const fullAddress = firstExisting(row, [
    'full_address', 'fullAddress', 'single_cleaned_block', 'clean_text', 'raw_address'
  ]);

  const explicitLine1 = firstExisting(row, [
    'address_line_1', 'Address Line 1', 'addressLine1',
    'address_display_packer', 'parsedLocationOnly'
  ]);

  const coreParts = [
    firstExisting(row, ['house_number', 'house_no', 'บ้านเลขที่']),
    firstExisting(row, ['moo', 'หมู่ที่', 'หมู่']),
    firstExisting(row, ['soi', 'ซอย']),
    firstExisting(row, ['road', 'ถนน']),
    firstExisting(row, ['room', 'ห้อง']),
    firstExisting(row, ['floor', 'ชั้น']),
    firstExisting(row, ['building', 'building_name', 'อาคาร', 'คอนโด']),
  ].filter(Boolean);

  // Line 1 คือพิกัดหลัก; ถ้าไม่มีฟิลด์แยก ให้ใช้ Full Address เดิมเพื่อไม่ให้ข้อมูลหาย
  const line1 = explicitLine1 || coreParts.join(' ') || fullAddress;

  const explicitLine2 = firstExisting(row, [
    'address_line_2', 'Address Line 2', 'addressLine2'
  ]);
  const extraParts = [
    firstExisting(row, ['village', 'village_name', 'หมู่บ้าน']),
    firstExisting(row, ['project', 'project_name', 'ชื่อโครงการ']),
    firstExisting(row, ['landmark', 'สถานที่สำคัญ', 'place', 'สถานที่']),
    firstExisting(row, ['temple', 'วัด']),
    firstExisting(row, ['office', 'สำนักงาน']),
  ].filter(Boolean);
  const line2 = explicitLine2 || extraParts.join(' ');

  const adminParts = [
    firstExisting(row, ['subDistrict', 'sub_district', 'ตำบล', 'แขวง']),
    firstExisting(row, ['district', 'อำเภอ', 'เขต']),
    firstExisting(row, ['province', 'จังหวัด']),
    firstExisting(row, ['zipcode', 'postal_code', 'รหัสไปรษณีย์']),
  ].filter(Boolean);

  // ถ้ามี Full Address เดิม ให้เก็บเดิมทั้งหมด ห้ามสร้างใหม่ทับข้อมูลจริง
  const full = fullAddress || [line1, line2, ...adminParts].filter(Boolean).join(' ');
  return { addressLine1: line1, addressLine2: line2, fullAddress: full };
}

function getPackerProduct(row) {
  const sku = firstExisting(row, ['sku']);
  // ใช้อีโมจิจากโหนดจริงเท่านั้น ห้ามเดาสีจาก SKU หรือเติมอีโมจิใหม่
  const emoji = firstExisting(row, ['emoji', 'extracted_emoji', 'product_color_tag']);
  const thaiName = firstExisting(row, ['th_name', 'thName', 'product_th_name']);
  const quantity = getProductQuantity(row);

  // SKU + ชื่อไทย + จำนวนจริงจากข้อความสินค้า
  if (sku && thaiName && quantity) {
    return `${emoji ? `${emoji} ` : ''}${sku}(${thaiName}) ${quantity} คอต`;
  }

  // หากไม่มีข้อมูลพอ ให้ใช้ค่าที่โหนดเดิมสร้างไว้ โดยไม่สร้างข้อความทดแทน
  return firstExisting(row, ['display_for_packer', 'packer_display_text']);
}

function getExpectedCod(row) {
  // expected_cod จากโหนดหน้าสุดเป็นค่าหลัก เพราะคำนวณจากราคากลาง × จำนวนคอตแล้ว
  const expected = firstExisting(row, ['expected_cod']);
  if (expected !== '') return money(expected);

  // สำรองกรณีบางรายการยังไม่มี expected_cod
  const direct = firstExisting(row, ['cod_amount', 'cod', 'total_cod', 'order_total']);
  return direct === '' ? '' : money(direct);
}

function copyButton(text) {
  if (!text || text.length > 256) return null;
  return {
    text: '📋 คัดลอกข้อมูลแพ็ก',
    copy_text: { text },
  };
}

const output = inputItems.map((item) => {
  const row = item.json ?? {};
  const orderNumber = value(row, 'order_number');
  const oneDate = getOneOrderDate(row);
  const status = firstExisting(row, ['status', 'order_status', 'bill_status']);
  const pageName = firstExisting(row, ['page_Name', 'page_name']);
  const facebookName = value(row, 'facebook_name');
  const cod = getExpectedCod(row);
  const customer = value(row, 'customer_name');
  const phone = value(row, 'phone');
  const addressParts = splitAddress(row);
  const address = addressParts.fullAddress;
  const zipcode = value(row, 'zipcode');
  const shipping = firstExisting(row, ['shipping_name', 'shipping', 'carrier']);
  const product = getPackerProduct(row);

  const telegramMessage = [
    status ? `🚀 <b>[${escapeHtml(status)}]</b>` : '🚀',
    '━━━━━━━━━━━━━━━━━━━━',
    orderNumber ? `🆔 <code>${escapeHtml(orderNumber)}</code>` : '',
    oneDate ? `⏰ <code>${escapeHtml(oneDate)}</code>` : '',
    cod !== '' ? `💰 <code>${escapeHtml(cod)} บาท</code>` : '',
    '━━━━━━━━━━━━━━━━━━━━',
    customer ? escapeHtml(customer) : '',
    phone ? `<code>${escapeHtml(phone)}</code>` : '',
    address ? `<code>${escapeHtml(address)}</code>` : '',
    zipcode ? escapeHtml(zipcode) : '',
    '📦 <b>รายการสินค้าสำหรับแพ็ก</b>',
    product ? escapeHtml(product) : '',
    shipping ? `🚚 ขนส่ง: ${escapeHtml(shipping)}` : '',
    '━━━━━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n');

  // ข้อมูลสำหรับก๊อปเป็นข้อความล้วน ไม่มีป้ายกำกับหรือไอคอนที่ต้องลบภายหลัง
  // อีโมจิหน้าสินค้าคงไว้ เพราะช่วยให้คนแพ็กจำสีสินค้าได้
  const copyText = [
    orderNumber,
    oneDate,
    cod !== '' ? `${cod} บาท` : '',
    customer,
    phone,
    address,
    zipcode,
    product,
  ].filter(Boolean).join('\n');

  const body = {
    chat_id: value(row, 'telegram_chat_id') || CHAT_ID,
    text: telegramMessage,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  const button = copyButton(copyText);
  if (button) body.reply_markup = { inline_keyboard: [[button]] };

  return {
    json: {
      // คงข้อมูลต้นฉบับทุกฟิลด์ไว้ครบ
      ...row,
      // เพิ่มฟิลด์ใหม่สำหรับส่ง Telegram
      telegram_message: telegramMessage,
      telegram_copy_text: copyText,
      telegram_body: body,
      telegram_product_used: product,
      telegram_quantity_used: getProductQuantity(row),
      address_line_1: addressParts.addressLine1,
      address_line_2: addressParts.addressLine2,
      full_address: addressParts.fullAddress,
      telegram_expected_cod_used: cod,
    },
  };
});

return output;
