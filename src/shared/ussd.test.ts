import { describe, it, expect } from 'vitest'
import { generateUssdCode, parseUssdCode } from './ussd'

describe('ussd utilities', () => {
  describe('generateUssdCode', () => {
    it('generates standard Mobilis Arsselli code', () => {
      const code = generateUssdCode('mobilis', '0661234567', '500', '0000')
      expect(code).toBe('*600*1*0661234567*500*0000#')
    })

    it('generates standard Djezzy Flexy code', () => {
      const code = generateUssdCode('djezzy', '0770123456', '1000', '1234')
      expect(code).toBe('*770*0770123456*1000*1234#')
    })

    it('generates standard Ooredoo Storm code', () => {
      const code = generateUssdCode('ooredoo', '0550123456', '200', '0000')
      expect(code).toBe('*115*0550123456*200*0000#')
    })

    it('uses placeholders when values are empty', () => {
      const code = generateUssdCode('mobilis')
      expect(code).toBe('*600*1*06XXXXXXXX*0*0000#')
    })
  })

  describe('parseUssdCode', () => {
    it('parses Mobilis code accurately', () => {
      const parsed = parseUssdCode('*600*1*0661234567*500*0000#')
      expect(parsed.operatorKey).toBe('mobilis')
      expect(parsed.phone).toBe('0661234567')
      expect(parsed.amount).toBe('500')
      expect(parsed.pin).toBe('0000')
      expect(parsed.isValid).toBe(true)
    })

    it('parses Djezzy code accurately', () => {
      const parsed = parseUssdCode('*770*0770123456*1000*1234#')
      expect(parsed.operatorKey).toBe('djezzy')
      expect(parsed.phone).toBe('0770123456')
      expect(parsed.amount).toBe('1000')
      expect(parsed.pin).toBe('1234')
      expect(parsed.isValid).toBe(true)
    })

    it('parses Ooredoo code accurately', () => {
      const parsed = parseUssdCode('*115*0550123456*200*0000#')
      expect(parsed.operatorKey).toBe('ooredoo')
      expect(parsed.phone).toBe('0550123456')
      expect(parsed.amount).toBe('200')
      expect(parsed.pin).toBe('0000')
      expect(parsed.isValid).toBe(true)
    })

    it('handles 9-digit phone numbers by prepending 0', () => {
      const parsed = parseUssdCode('*600*1*661234567*300*0000#')
      expect(parsed.phone).toBe('0661234567')
      expect(parsed.amount).toBe('300')
    })

    it('handles loose custom format with phone and amount', () => {
      const parsed = parseUssdCode('*600*2*0661234567*500#')
      expect(parsed.operatorKey).toBe('mobilis')
      expect(parsed.phone).toBe('0661234567')
      expect(parsed.amount).toBe('500')
      expect(parsed.isValid).toBe(true)
    })

    it('returns invalid for empty or unparseable text', () => {
      const parsed = parseUssdCode('hello world')
      expect(parsed.isValid).toBe(false)
      expect(parsed.phone).toBeNull()
    })
  })
})
