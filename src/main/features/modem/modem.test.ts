import { describe, expect, it } from 'vitest'
import { openTestDb } from '@main/core/db/testDb'
import {
  createModemService,
  decodeUcs2Hex,
  extractRemainingBalance,
  extractTransactionId,
  isPcUiPort,
} from './modem.service'
import type { SessionUser } from '@shared/contracts/auth'

const adminUser: SessionUser = { id: 1, name: 'مالك المحل', role: 'admin' }

describe('modem utilities', () => {
  it('decodeUcs2Hex decodes hex correctly and ignores plain text', () => {
    // "OK" in UCS-2 hex is "004F004B"
    expect(decodeUcs2Hex('004F004B')).toBe('OK')
    // Plain text is returned as is
    expect(decodeUcs2Hex('Normal Text')).toBe('Normal Text')
  })

  it('isPcUiPort identifies Huawei PC UI and ZTE ports', () => {
    expect(
      isPcUiPort({
        path: 'COM8',
        friendlyName: 'HUAWEI Mobile Connect - 3G PC UI Interface (COM8)',
      }),
    ).toBe(true)

    expect(
      isPcUiPort({
        path: 'COM6',
        friendlyName: 'HUAWEI Mobile Connect - 3G Application Interface (COM6)',
      }),
    ).toBe(false)

    expect(
      isPcUiPort({
        path: 'COM12',
        friendlyName: 'ZTE Diagnostics Interface (COM12)',
      }),
    ).toBe(false)

    expect(
      isPcUiPort({
        path: 'COM14',
        friendlyName: 'ZTE Proprietary USB Modem (COM14)',
      }),
    ).toBe(true)

    expect(
      isPcUiPort({
        path: '/dev/ttyUSB1',
      }),
    ).toBe(true)
  })

  it('extractRemainingBalance parses balance from various operator messages', () => {
    expect(
      extractRemainingBalance('تم تحويل 500 دج بنجاح. رصيدك المتبقي: 42500 دج. رقم المعاملة: 12345'),
    ).toBe(42500)

    expect(
      extractRemainingBalance('Votre transfert a ete effectue. Solde restant: 35,900.50 DA. Ref: MOB-123'),
    ).toBe(35900.5)

    expect(
      extractRemainingBalance('Storm Ooredoo: Solde: 51200 DA'),
    ).toBe(51200)
  })

  it('extractTransactionId parses references and transaction IDs', () => {
    expect(
      extractTransactionId('تم تحويل 500 دج بنجاح. رقم المعاملة: MOB-98421.'),
    ).toBe('MOB-98421')

    expect(
      extractTransactionId('Votre transfert a ete effectue avec succes. Ref: DJZ-44120.'),
    ).toBe('DJZ-44120')

    expect(
      extractTransactionId('Transaction: TRX-88319.'),
    ).toBe('TRX-88319')
  })
})

describe('modem.service', () => {
  it('retrieves default configuration when empty', () => {
    const { db, audit, logger, close } = openTestDb()
    try {
      const modem = createModemService({ db, audit, logger })
      const config = modem.getConfig()

      expect(config.slots).toHaveLength(6)
      expect(config.operatorSettings.mobilis.pinCode).toBe('0000')
      expect(config.operatorSettings.djezzy.transferFormat).toContain('*770*')
      expect(config.operatorSettings.ooredoo.transferFormat).toContain('*115*')
    } finally {
      close()
    }
  })

  it('saves and re-reads configuration correctly', () => {
    const { db, audit, logger, close } = openTestDb()
    try {
      const modem = createModemService({ db, audit, logger })
      const config = modem.getConfig()

      config.slots[0]!.port = 'COM8'
      config.operatorSettings.mobilis.pinCode = '1234'
      modem.saveConfig(config, adminUser)

      const reloaded = modem.getConfig()
      expect(reloaded.slots[0]!.port).toBe('COM8')
      expect(reloaded.operatorSettings.mobilis.pinCode).toBe('1234')
    } finally {
      close()
    }
  })

  it('autoDetect assigns ports to Mobilis, Djezzy, and Ooredoo slots', async () => {
    const { db, audit, logger, close } = openTestDb()
    try {
      const modem = createModemService({ db, audit, logger })
      const detected = await modem.autoDetect(adminUser)

      const mobilisSlot = detected.slots.find((s) => s.operator === 'mobilis' && s.slotIndex === 1)
      const djezzySlot = detected.slots.find((s) => s.operator === 'djezzy' && s.slotIndex === 1)
      const ooredooSlot = detected.slots.find((s) => s.operator === 'ooredoo' && s.slotIndex === 1)

      expect(mobilisSlot?.port).toBeTruthy()
      expect(djezzySlot?.port).toBeTruthy()
      expect(ooredooSlot?.port).toBeTruthy()
      expect(mobilisSlot?.connected).toBe(true)
    } finally {
      close()
    }
  })

  it('sendUssd and checkBalance execute and parse responses', async () => {
    const { db, audit, logger, close } = openTestDb()
    try {
      const modem = createModemService({ db, audit, logger })
      await modem.autoDetect(adminUser)

      const result = await modem.sendUssd(
        {
          operator: 'mobilis',
          slotIndex: 1,
          ussdCode: '*610*1*0661123456*500*0000#',
        },
        adminUser,
      )

      expect(result.success).toBe(true)
      expect(result.extractedBalance).toBeDefined()
      expect(result.extractedTransactionId).toBeDefined()

      const balanceResult = await modem.checkBalance('mobilis', 1, adminUser)
      expect(balanceResult.success).toBe(true)
      expect(balanceResult.parsedMessage).toContain('solde')
    } finally {
      close()
    }
  })

  it('connectSlot and disconnectSlot update slot states', async () => {
    const { db, audit, logger, close } = openTestDb()
    try {
      const modem = createModemService({ db, audit, logger })
      await modem.autoDetect(adminUser)

      const disconnected = await modem.disconnectSlot({ operator: 'mobilis', slotIndex: 1 }, adminUser)
      expect(disconnected.connected).toBe(false)
      expect(disconnected.statusText).toBe('غير متصل')

      const reconnected = await modem.connectSlot({ operator: 'mobilis', slotIndex: 1 }, adminUser)
      expect(reconnected.connected).toBe(true)
      expect(reconnected.statusText).toBe('Con.f')
    } finally {
      close()
    }
  })
})
