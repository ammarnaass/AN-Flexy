export type OperatorKey = 'mobilis' | 'djezzy' | 'ooredoo'

export interface ParsedUssdResult {
  operatorKey: OperatorKey | null
  phone: string | null
  amount: string | null
  pin: string | null
  isValid: boolean
}

/**
 * Generate a standard USSD code for the specified operator.
 */
export function generateUssdCode(
  operator: OperatorKey | string | undefined,
  phone = '',
  amount = '',
  pin = '0000',
): string {
  const op = (operator ?? '').toLowerCase()
  const cleanPhone = phone.trim() || (op.includes('mobilis') || op.includes('موبيليس') ? '06XXXXXXXX' : op.includes('djezzy') || op.includes('جيزي') ? '07XXXXXXXX' : '05XXXXXXXX')
  const cleanAmount = amount.toString().trim() || '0'
  const cleanPin = pin.trim() || '0000'

  if (op.includes('mobilis') || op.includes('موبيليس')) {
    return `*600*1*${cleanPhone}*${cleanAmount}*${cleanPin}#`
  }
  if (op.includes('djezzy') || op.includes('جيزي')) {
    return `*770*${cleanPhone}*${cleanAmount}*${cleanPin}#`
  }
  return `*115*${cleanPhone}*${cleanAmount}*${cleanPin}#`
}

/**
 * Parse an arbitrary USSD string or command to extract operator, recipient phone, amount, and pin.
 */
export function parseUssdCode(rawCode: string): ParsedUssdResult {
  const code = rawCode.trim()
  if (!code) {
    return {
      operatorKey: null,
      phone: null,
      amount: null,
      pin: null,
      isValid: false,
    }
  }

  // 1. Check Mobilis patterns (*600*1*PHONE*AMT*PIN# or *600*PHONE*AMT*PIN#)
  const mobilisMatch = code.match(/^\*600\*(?:1\*)?(\d{9,10})\*(\d+)(?:\*(\d+))?#?$/)
  if (mobilisMatch) {
    let p = mobilisMatch[1] ?? ''
    if (p.length === 9 && !p.startsWith('0')) p = '0' + p
    return {
      operatorKey: 'mobilis',
      phone: p,
      amount: mobilisMatch[2] ?? null,
      pin: mobilisMatch[3] ?? null,
      isValid: true,
    }
  }

  // 2. Check Djezzy patterns (*770*PHONE*AMT*PIN# or *770*1*PHONE*AMT*PIN#)
  const djezzyMatch = code.match(/^\*770\*(?:1\*)?(\d{9,10})\*(\d+)(?:\*(\d+))?#?$/)
  if (djezzyMatch) {
    let p = djezzyMatch[1] ?? ''
    if (p.length === 9 && !p.startsWith('0')) p = '0' + p
    return {
      operatorKey: 'djezzy',
      phone: p,
      amount: djezzyMatch[2] ?? null,
      pin: djezzyMatch[3] ?? null,
      isValid: true,
    }
  }

  // 3. Check Ooredoo patterns (*115*PHONE*AMT*PIN# or *115*1*PHONE*AMT*PIN#)
  const ooredooMatch = code.match(/^\*115\*(?:1\*)?(\d{9,10})\*(\d+)(?:\*(\d+))?#?$/)
  if (ooredooMatch) {
    let p = ooredooMatch[1] ?? ''
    if (p.length === 9 && !p.startsWith('0')) p = '0' + p
    return {
      operatorKey: 'ooredoo',
      phone: p,
      amount: ooredooMatch[2] ?? null,
      pin: ooredooMatch[3] ?? null,
      isValid: true,
    }
  }

  // 4. Loose fallback pattern for custom USSD formats or copied text
  // Looks for a valid Algerian mobile number (05, 06, 07 followed by 8 digits)
  const phoneMatch = code.match(/(0[567]\d{8})/)
  let detectedPhone: string | null = null
  let detectedOp: OperatorKey | null = null

  if (phoneMatch && phoneMatch[1]) {
    detectedPhone = phoneMatch[1]
    if (detectedPhone.startsWith('06')) detectedOp = 'mobilis'
    else if (detectedPhone.startsWith('07')) detectedOp = 'djezzy'
    else if (detectedPhone.startsWith('05')) detectedOp = 'ooredoo'
  }

  // Extract amount: prioritize tokens appearing after the phone number, excluding known service codes
  const serviceCodes = new Set(['600', '770', '115', '710', '200', '151', '707', '1', '2', '0', '00', '000', '0000'])
  let detectedAmount: string | null = null
  const tokens = code.split(/[*#\s]/).filter(Boolean)
  const phoneIdx = detectedPhone ? tokens.indexOf(detectedPhone) : -1

  if (phoneIdx !== -1) {
    // Look after phone first
    for (let i = phoneIdx + 1; i < tokens.length; i++) {
      const token = tokens[i]
      if (token && /^\d+$/.test(token) && !serviceCodes.has(token)) {
        detectedAmount = token
        break
      }
    }
  }

  // Fallback if not found after phone
  if (!detectedAmount) {
    for (const token of tokens) {
      if (token !== detectedPhone && /^\d+$/.test(token) && !serviceCodes.has(token)) {
        const num = parseInt(token, 10)
        if (num >= 10 && num <= 100000) {
          detectedAmount = token
          break
        }
      }
    }
  }

  // Check operator from USSD prefix if not already deduced
  if (!detectedOp) {
    if (code.includes('*600*') || code.includes('*600#')) detectedOp = 'mobilis'
    else if (code.includes('*770*') || code.includes('*710#')) detectedOp = 'djezzy'
    else if (code.includes('*115*') || code.includes('*200#')) detectedOp = 'ooredoo'
  }

  return {
    operatorKey: detectedOp,
    phone: detectedPhone,
    amount: detectedAmount,
    pin: null,
    isValid: Boolean(detectedPhone && detectedAmount),
  }
}
