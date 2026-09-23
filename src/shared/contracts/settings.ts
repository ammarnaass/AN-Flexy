import { z } from 'zod'

// قنوات خاصية الإعدادات — تُعرَّف مرة واحدة هنا (RULES 6.2-1).
export const settingsChannels = {
  get: 'settings:get',
  set: 'settings:set',
  list: 'settings:list',
} as const

export const SETTINGS_ERRORS = {
  INVALID_SETTING_VALUE: 'INVALID_SETTING_VALUE',
} as const

// مفاتيح الإعدادات المعروفة (المورد العام في PRD §13/F1).
export const SETTING_KEYS = {
  shopName: 'shop_name',
} as const

export const settingKeySchema = z.enum(['shop_name'])
export type SettingKey = z.infer<typeof settingKeySchema>

export const getSettingInput = z.object({ key: settingKeySchema })

export const setSettingInput = z.object({
  key: settingKeySchema,
  value: z.string().trim().min(1).max(100),
})
export type SetSettingInput = z.infer<typeof setSettingInput>

export const settingItem = z.object({
  key: settingKeySchema,
  value: z.string(),
})
export type SettingItem = z.infer<typeof settingItem>
