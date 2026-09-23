// كل المبالغ أعداد صحيحة بالسنتيم (RULES 7.6).
// التحويل والتنسيق يتم هنا فقط، وبالعمليات النصية، بلا parseFloat ولا Number(x) * 100 على مدخل المستخدم.

const INPUT_PATTERN = /^\d{1,12}([.,]\d{0,2})?$/

/**
 * يحوّل مدخل المستخدم النصي إلى سنتيم: "123"، "123.45"، "123,45"، "1 234,56".
 * يعيد null إن كان المدخل غير صالح. لا يقبل السالب ولا أكثر من خانتين عشريتين.
 */
export function parseDaToCentimes(input: string): number | null {
  const cleaned = input.trim().replace(/\s+/g, '').replace(',', '.')
  if (!INPUT_PATTERN.test(cleaned)) return null
  const dot = cleaned.indexOf('.')
  const da = dot === -1 ? cleaned : cleaned.slice(0, dot)
  const cents = (dot === -1 ? '' : cleaned.slice(dot + 1)).padEnd(2, '0')
  // دمج نصي بدل الضرب بالفاصلة العشرية: 12 خانة + خانتان للسنتيم تبقى دون 2^53.
  return Number(da + cents)
}

/** ينسّق السنتيم للعرض: 123456 → "1 234,56 DA" بأرقام لاتينية (PRD §6). */
export function formatDa(centimes: number): string {
  const negative = centimes < 0
  const abs = Math.abs(Math.trunc(centimes))
  const da = Math.trunc(abs / 100)
  const cents = abs % 100
  const grouped = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(da)
  return `${negative ? '-' : ''}${grouped},${String(cents).padStart(2, '0')} DA`
}
