import { z } from 'zod'

// قنوات خاصية المودم والفلاشة (Dongles) — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const modemChannels = {
  listPorts: 'modem:list-ports',
  getConfig: 'modem:get-config',
  saveConfig: 'modem:save-config',
  autoDetect: 'modem:auto-detect',
  connectSlot: 'modem:connect-slot',
  disconnectSlot: 'modem:disconnect-slot',
  sendUssd: 'modem:send-ussd',
  checkBalance: 'modem:check-balance',
} as const

export const MODEM_ERRORS = {
  PORT_NOT_FOUND: 'PORT_NOT_FOUND',
  PORT_OPEN_FAILED: 'PORT_OPEN_FAILED',
  MODEM_BUSY: 'MODEM_BUSY',
  AT_COMMAND_TIMEOUT: 'AT_COMMAND_TIMEOUT',
  USSD_FAILED: 'USSD_FAILED',
  OPERATOR_NOT_CONFIGURED: 'OPERATOR_NOT_CONFIGURED',
  SIM_NOT_READY: 'SIM_NOT_READY',
} as const

export const operatorKeySchema = z.enum(['djezzy', 'mobilis', 'ooredoo'])
export type OperatorKey = z.infer<typeof operatorKeySchema>

export const slotIndexSchema = z.union([z.literal(1), z.literal(2)])
export type SlotIndex = z.infer<typeof slotIndexSchema>

export const dongleTypeSchema = z.enum(['huawei', 'zte'])
export type DongleType = z.infer<typeof dongleTypeSchema>

export const portInfoSchema = z.object({
  path: z.string(),
  friendlyName: z.string(),
  manufacturer: z.string().optional(),
  vendorId: z.string().optional(),
  productId: z.string().optional(),
  isPcUi: z.boolean(),
})
export type PortInfo = z.infer<typeof portInfoSchema>

export const modemSlotSchema = z.object({
  operator: operatorKeySchema,
  slotIndex: slotIndexSchema,
  port: z.string().default(''),
  dongleType: dongleTypeSchema.default('huawei'),
  model: z.string().default(''),
  connected: z.boolean().default(false),
  statusText: z.string().default('غير متصل'),
  signalStrength: z.number().int().min(0).max(31).nullable().default(null),
  imei: z.string().optional(),
  imsi: z.string().optional(),
})
export type ModemSlot = z.infer<typeof modemSlotSchema>

export const operatorPinAndFormatSchema = z.object({
  pinCode: z.string().default('0000'),
  transferFormat: z.string(),
  balanceFormat: z.string(),
  minAmount: z.number().int().nonnegative().default(100),
  maxAmount: z.number().int().positive().default(50000),
})
export type OperatorPinAndFormat = z.infer<typeof operatorPinAndFormatSchema>

export const confirmationSettingsSchema = z.object({
  autoConfirm: z.boolean().default(true),
  timeoutSeconds: z.number().int().min(5).max(60).default(20),
  successKeywords: z.array(z.string()).default(['succes', 'reussie', 'تم تحويل', 'تم التحويل', 'reussi', 'transféré']),
  failureKeywords: z.array(z.string()).default(['echec', 'refuse', 'خطأ', 'فشل', 'solde insuffisant', 'incorrect']),
})
export type ConfirmationSettings = z.infer<typeof confirmationSettingsSchema>

export const modemConfigSchema = z.object({
  slots: z.array(modemSlotSchema),
  operatorSettings: z.record(operatorKeySchema, operatorPinAndFormatSchema),
  confirmation: confirmationSettingsSchema,
})
export type ModemConfig = z.infer<typeof modemConfigSchema>

export const saveModemConfigInput = modemConfigSchema
export type SaveModemConfigInput = z.infer<typeof saveModemConfigInput>

export const connectSlotInput = z.object({
  operator: operatorKeySchema,
  slotIndex: slotIndexSchema,
})
export type ConnectSlotInput = z.infer<typeof connectSlotInput>

export const disconnectSlotInput = z.object({
  operator: operatorKeySchema,
  slotIndex: slotIndexSchema,
})
export type DisconnectSlotInput = z.infer<typeof disconnectSlotInput>

export const sendUssdInput = z.object({
  operator: operatorKeySchema,
  slotIndex: slotIndexSchema.optional().default(1),
  ussdCode: z.string().min(3),
  timeoutMs: z.number().int().positive().optional(),
})
export type SendUssdInput = z.infer<typeof sendUssdInput>

export const sendUssdResultSchema = z.object({
  success: z.boolean(),
  rawResponse: z.string(),
  parsedMessage: z.string().optional(),
  extractedBalance: z.number().optional(),
  extractedTransactionId: z.string().optional(),
  error: z.string().optional(),
})
export type SendUssdResult = z.infer<typeof sendUssdResultSchema>

export const checkBalanceInput = z.object({
  operator: operatorKeySchema,
  slotIndex: slotIndexSchema.optional().default(1),
})
export type CheckBalanceInput = z.infer<typeof checkBalanceInput>

export const defaultModemConfig: ModemConfig = {
  slots: [
    { operator: 'djezzy', slotIndex: 1, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
    { operator: 'djezzy', slotIndex: 2, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
    { operator: 'mobilis', slotIndex: 1, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
    { operator: 'mobilis', slotIndex: 2, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
    { operator: 'ooredoo', slotIndex: 1, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
    { operator: 'ooredoo', slotIndex: 2, port: '', dongleType: 'huawei', model: 'huawei E3531', connected: false, statusText: 'غير متصل', signalStrength: null },
  ],
  operatorSettings: {
    djezzy: {
      pinCode: '0000',
      transferFormat: '*770*1*{PHONE}*{AMOUNT}*{PIN}#',
      balanceFormat: '*710#',
      minAmount: 100,
      maxAmount: 50000,
    },
    mobilis: {
      pinCode: '0000',
      transferFormat: '*610*1*{PHONE}*{AMOUNT}*{PIN}#',
      balanceFormat: '*222#',
      minAmount: 100,
      maxAmount: 50000,
    },
    ooredoo: {
      pinCode: '0000',
      transferFormat: '*115*{PHONE}*{AMOUNT}*{PIN}#',
      balanceFormat: '*200#',
      minAmount: 100,
      maxAmount: 50000,
    },
  },
  confirmation: {
    autoConfirm: true,
    timeoutSeconds: 20,
    successKeywords: ['succes', 'reussie', 'تم تحويل', 'تم التحويل', 'reussi', 'transféré'],
    failureKeywords: ['echec', 'refuse', 'خطأ', 'فشل', 'solde insuffisant', 'incorrect'],
  },
}
