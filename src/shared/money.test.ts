import { describe, expect, it } from 'vitest'
import { formatDa, parseDaToCentimes } from './money'

describe('parseDaToCentimes', () => {
  it('يحوّل الأعداد الصحيحة', () => {
    expect(parseDaToCentimes('0')).toBe(0)
    expect(parseDaToCentimes('50')).toBe(5000)
    expect(parseDaToCentimes('1234')).toBe(123400)
  })

  it('يحوّل الكسور بالنقطة والفاصلة', () => {
    expect(parseDaToCentimes('123.45')).toBe(12345)
    expect(parseDaToCentimes('123,45')).toBe(12345)
    expect(parseDaToCentimes('0.5')).toBe(50)
    expect(parseDaToCentimes('10.')).toBe(1000)
  })

  it('يتجاهل الفراغات وفواصل الآلاف', () => {
    expect(parseDaToCentimes(' 1 234,56 ')).toBe(123456)
  })

  it('يرفض المدخلات غير الصالحة', () => {
    expect(parseDaToCentimes('')).toBeNull()
    expect(parseDaToCentimes('abc')).toBeNull()
    expect(parseDaToCentimes('1.234')).toBeNull()
    expect(parseDaToCentimes('-50')).toBeNull()
    expect(parseDaToCentimes('1,2.3')).toBeNull()
  })

  it('لا يستخدم فاصلة عشرية في الحساب', () => {
    // 0.1 + 0.2 !== 0.3 بالفاصلة العشرية؛ هنا يجب أن يطابق تمامًا.
    expect(parseDaToCentimes('0.07')).toBe(7)
    expect(parseDaToCentimes('999999999999.99')).toBe(99999999999999)
  })
})

describe('formatDa', () => {
  it('ينسّق القيم الموجبة', () => {
    expect(formatDa(0)).toBe('0,00 DA')
    expect(formatDa(50)).toBe('0,50 DA')
    expect(formatDa(5000)).toBe('50,00 DA')
    expect(formatDa(123456)).toBe('1 234,56 DA')
  })

  it('ينسّق القيم السالبة (تسوية المخزون)', () => {
    expect(formatDa(-12345)).toBe('-123,45 DA')
  })
})
