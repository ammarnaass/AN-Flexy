import { useState, useEffect } from 'react'
import {
  useAutoDetectModem,
  useCheckBalance,
  useConnectModemSlot,
  useDisconnectModemSlot,
  useModemConfig,
  useModemPorts,
  useSaveModemConfig,
} from '../hooks'
import { playBeep } from '@renderer/shared/audio'
import type { ModemConfig, ModemSlot, OperatorKey, SlotIndex } from '@shared/contracts/modem'

type SubTab = 'ports' | 'codes' | 'confirmation'

export function ModemSettingsTab() {
  const [subTab, setSubTab] = useState<SubTab>('ports')

  // API hooks
  const configQuery = useModemConfig()
  const portsQuery = useModemPorts()
  const saveConfig = useSaveModemConfig()
  const autoDetect = useAutoDetectModem()
  const connectSlot = useConnectModemSlot()
  const disconnectSlot = useDisconnectModemSlot()
  const checkBalance = useCheckBalance()

  // Local working copy of config
  const [localConfig, setLocalConfig] = useState<ModemConfig | null>(null)
  const [activeMessage, setActiveMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)

  // Balance test response state
  const [balanceOutput, setBalanceOutput] = useState<{ op: string; text: string } | null>(null)

  // Sync server config into local state
  useEffect(() => {
    if (configQuery.data) {
      setLocalConfig(JSON.parse(JSON.stringify(configQuery.data)))
    }
  }, [configQuery.data])

  const availablePorts = portsQuery.data ?? []

  // Helper to find slot in local state
  const getSlot = (operator: OperatorKey, slotIndex: SlotIndex): ModemSlot | undefined => {
    return localConfig?.slots.find((s) => s.operator === operator && s.slotIndex === slotIndex)
  }

  // Update slot in local state
  const updateSlot = (operator: OperatorKey, slotIndex: SlotIndex, updates: Partial<ModemSlot>) => {
    if (!localConfig) return
    const updated = { ...localConfig }
    const slot = updated.slots.find((s) => s.operator === operator && s.slotIndex === slotIndex)
    if (slot) {
      Object.assign(slot, updates)
      setLocalConfig(updated)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!localConfig) return
    playBeep('click')
    try {
      await saveConfig.mutateAsync(localConfig)
      playBeep('success')
      setActiveMessage({ text: 'تم حفظ إعدادات المنافذ والفلاشات بنجاح', type: 'success' })
      setTimeout(() => {
        setActiveMessage(null)
      }, 4000)
    } catch (err) {
      playBeep('error')
      setActiveMessage({ text: `فشل الحفظ: ${String(err)}`, type: 'error' })
    }
  }

  // Auto Detect dongles (كشف تلقائي)
  const handleAutoDetect = async () => {
    playBeep('click')
    setActiveMessage({ text: 'جاري فحص منافذ USB التسلسلية وقراءة بطاقات SIM (AT+CIMI / ATI)...', type: 'info' })
    try {
      const detected = await autoDetect.mutateAsync()
      setLocalConfig(JSON.parse(JSON.stringify(detected)))
      playBeep('success')
      const connectedCount = detected.slots.filter((s) => s.connected).length
      setActiveMessage({
        text: `تم الكشف التلقائي بنجاح! تم توصيل وتحديد ${connectedCount} فلاشات تلقائياً.`,
        type: 'success',
      })
      setTimeout(() => setActiveMessage(null), 6000)
    } catch (err) {
      playBeep('error')
      setActiveMessage({ text: `فشل الكشف التلقائي: ${String(err)}`, type: 'error' })
    }
  }

  // Reset to saved state
  const handleCancel = () => {
    playBeep('click')
    if (configQuery.data) {
      setLocalConfig(JSON.parse(JSON.stringify(configQuery.data)))
      setActiveMessage({ text: 'تمت استعادة الإعدادات المحفوظة.', type: 'info' })
      setTimeout(() => setActiveMessage(null), 3000)
    }
  }

  // Connect or disconnect slot
  const handleToggleConnect = async (operator: OperatorKey, slotIndex: SlotIndex) => {
    const slot = getSlot(operator, slotIndex)
    if (!slot) return
    playBeep('click')

    if (slot.connected) {
      try {
        await disconnectSlot.mutateAsync({ operator, slotIndex })
        updateSlot(operator, slotIndex, { connected: false, statusText: 'غير متصل' })
        playBeep('click')
      } catch (err) {
        playBeep('error')
        setActiveMessage({ text: `خطأ في فصل المنفذ: ${String(err)}`, type: 'error' })
      }
    } else {
      if (!slot.port) {
        setActiveMessage({ text: 'يرجى اختيار المنفذ أولاً', type: 'error' })
        playBeep('error')
        return
      }
      try {
        const res = await connectSlot.mutateAsync({ operator, slotIndex })
        updateSlot(operator, slotIndex, {
          connected: res.connected,
          statusText: res.statusText,
          signalStrength: res.signalStrength,
        })
        playBeep('success')
      } catch (err) {
        playBeep('error')
        setActiveMessage({ text: `تعذر الاتصال بالمنفذ ${slot.port}: ${String(err)}`, type: 'error' })
      }
    }
  }

  // Test Balance query
  const handleTestBalance = async (operator: OperatorKey, slotIndex: SlotIndex) => {
    playBeep('click')
    setBalanceOutput({ op: operator, text: 'جاري الاستعلام عن الرصيد عبر USSD...' })
    try {
      const res = await checkBalance.mutateAsync({ operator, slotIndex })
      playBeep('success')
      setBalanceOutput({
        op: operator,
        text: res.parsedMessage || res.rawResponse || 'تم استلام الاستجابة بنجاح',
      })
      setTimeout(() => setBalanceOutput(null), 10000)
    } catch (err) {
      playBeep('error')
      setBalanceOutput({ op: operator, text: `خطأ: ${String(err)}` })
    }
  }

  const operatorsList: Array<{
    key: OperatorKey
    nameAr: string
    nameFr: string
    color: string
    bgLight: string
    border: string
    badgeBg: string
    logoLetter: string
  }> = [
    {
      key: 'djezzy',
      nameAr: 'جيزي',
      nameFr: 'Djezzy',
      color: 'text-red-700',
      bgLight: 'bg-red-500/5',
      border: 'border-red-500/20',
      badgeBg: 'bg-red-500/10 text-red-700',
      logoLetter: 'D',
    },
    {
      key: 'mobilis',
      nameAr: 'موبيليس',
      nameFr: 'Mobilis',
      color: 'text-emerald-700',
      bgLight: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      badgeBg: 'bg-emerald-500/10 text-emerald-700',
      logoLetter: 'M',
    },
    {
      key: 'ooredoo',
      nameAr: 'أوريدو',
      nameFr: 'Ooredoo',
      color: 'text-red-600',
      bgLight: 'bg-red-500/5',
      border: 'border-red-500/20',
      badgeBg: 'bg-red-500/10 text-red-600',
      logoLetter: 'O',
    },
  ]

  if (!localConfig) {
    return (
      <div className="flex items-center justify-center p-12 bg-surface-container-low rounded-2xl border border-outline-variant/30">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin mr-3">progress_activity</span>
        <span className="font-headline-sm text-body-md font-cairo">جاري تحميل إعدادات الفلاشة والمنافذ...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-md w-full animate-in fade-in">
      {/* Subtabs Switcher (مطابق لصور النظام المرجعي) */}
      <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-xs">
        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setSubTab('ports')
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-space-md rounded-lg font-cairo font-bold text-body-sm transition-all cursor-pointer ${
            subTab === 'ports'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">usb</span>
          <span>Ports Com (منافذ الاتصال)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setSubTab('codes')
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-space-md rounded-lg font-cairo font-bold text-body-sm transition-all cursor-pointer ${
            subTab === 'codes'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">pin</span>
          <span>Codes PIN / Transfert / Montant (الرموز والتحويل)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click')
            setSubTab('confirmation')
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-space-md rounded-lg font-cairo font-bold text-body-sm transition-all cursor-pointer ${
            subTab === 'confirmation'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Confirmation (تأكيد التحويل)</span>
        </button>
      </div>

      {/* Status or Alert Banner */}
      {activeMessage && (
        <div
          className={`p-space-sm rounded-xl border flex items-center justify-between animate-in fade-in ${
            activeMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              : activeMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-800'
                : 'bg-primary-fixed/30 border-primary/30 text-on-surface'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {activeMessage.type === 'success' ? 'check_circle' : activeMessage.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="font-body-md font-bold text-body-sm">{activeMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveMessage(null)}
            className="p-1 hover:opacity-70 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Balance Query Live Response Display */}
      {balanceOutput && (
        <div className="p-space-md rounded-xl bg-surface-container-high border border-primary/30 flex items-center justify-between text-on-surface animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
            <div>
              <span className="font-bold text-primary font-cairo ml-2">استجابة USSD ({balanceOutput.op}):</span>
              <span className="font-mono text-body-sm text-on-surface font-semibold" dir="ltr">
                {balanceOutput.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBalanceOutput(null)}
            className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 1: PORTS COM (مطابق تماماً لـ Image 1) */}
      {/* ========================================================= */}
      {subTab === 'ports' && (
        <div className="flex flex-col gap-space-md">
          {operatorsList.map((op) => {
            const slot1 = getSlot(op.key, 1)
            const slot2 = getSlot(op.key, 2)

            return (
              <div
                key={op.key}
                className={`bg-surface-container-lowest rounded-2xl p-space-md border ${op.border} shadow-xs flex flex-col gap-space-sm`}
              >
                {/* Operator Header Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg ${op.badgeBg} flex items-center justify-center font-bold font-cairo text-body-sm`}
                    >
                      {op.logoLetter}
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold font-cairo text-on-surface">
                      {op.nameFr} ({op.nameAr})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestBalance(op.key, 1)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm font-cairo font-bold cursor-pointer transition-colors shadow-2xs"
                      title="فحص الرصيد عبر USSD"
                    >
                      <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                      <span>فحص الرصيد</span>
                    </button>
                  </div>
                </div>

                {/* Slots Rows (Line 1 & Line 2) */}
                <div className="flex flex-col gap-2.5">
                  {[
                    { slot: slot1, index: 1 as SlotIndex, label: 'Ligne 1 (الخط 1)' },
                    { slot: slot2, index: 2 as SlotIndex, label: 'Ligne 2 (الخط 2)' },
                  ].map(({ slot, index, label }) => {
                    const isConnected = slot?.connected ?? false
                    const isMutating =
                      (connectSlot.isPending && connectSlot.variables?.operator === op.key && connectSlot.variables?.slotIndex === index) ||
                      (disconnectSlot.isPending && disconnectSlot.variables?.operator === op.key && disconnectSlot.variables?.slotIndex === index)

                    return (
                      <div
                        key={index}
                        className="flex flex-wrap items-center justify-between gap-space-sm p-space-xs rounded-xl bg-surface-container-low/70 border border-outline-variant/15 text-body-sm"
                      >
                        {/* Line identifier badge */}
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <span className="font-mono text-label-sm font-bold text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-high">
                            {label}
                          </span>
                        </div>

                        {/* COM Port Selector & Clear Button */}
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <select
                            value={slot?.port ?? ''}
                            onChange={(e) => updateSlot(op.key, index, { port: e.target.value })}
                            className="bg-surface-container-lowest text-on-surface font-mono text-label-md px-2.5 py-1.5 rounded-lg border border-outline-variant/20 focus:border-primary outline-none min-w-[170px]"
                          >
                            <option value="">-- اختر المنفذ --</option>
                            {availablePorts.map((p) => (
                              <option key={p.path} value={p.path}>
                                {p.path} {p.friendlyName && p.friendlyName !== p.path ? `(${p.friendlyName})` : ''}
                              </option>
                            ))}
                          </select>

                          {/* Clear [X] Button (matching reference screenshot) */}
                          <button
                            type="button"
                            onClick={() => updateSlot(op.key, index, { port: '', connected: false, statusText: 'غير متصل' })}
                            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-label-md cursor-pointer transition-colors"
                            title="مسح المنفذ"
                          >
                            X
                          </button>
                        </div>

                        {/* [Connecter] / [Déconnecter] Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleConnect(op.key, index)}
                          disabled={isMutating}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cairo font-bold text-label-md transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                            isConnected
                              ? 'bg-surface-container-high hover:bg-red-500/10 text-red-700 border border-red-500/20'
                              : 'bg-primary-container hover:bg-primary text-on-primary'
                          }`}
                        >
                          {isMutating ? (
                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">
                              {isConnected ? 'link_off' : 'link'}
                            </span>
                          )}
                          <span>{isConnected ? 'Déconnecter' : 'Connecter'}</span>
                        </button>

                        {/* Status Badge [Con.f] */}
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-label-sm border ${
                            isConnected
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                              : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`}
                          />
                          <span>{isConnected ? 'Con.f' : 'Non con.'}</span>
                        </div>

                        {/* Dongle Type Checkboxes (3G Huawei / ZTE) */}
                        <div className="flex items-center gap-3 text-label-sm font-mono" dir="ltr">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`dongleType_${op.key}_${index}`}
                              checked={slot?.dongleType === 'huawei'}
                              onChange={() => updateSlot(op.key, index, { dongleType: 'huawei' })}
                              className="accent-primary cursor-pointer"
                            />
                            <span className="font-semibold text-on-surface">3G Huawei</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`dongleType_${op.key}_${index}`}
                              checked={slot?.dongleType === 'zte'}
                              onChange={() => updateSlot(op.key, index, { dongleType: 'zte' })}
                              className="accent-primary cursor-pointer"
                            />
                            <span className="font-semibold text-on-surface">ZTE</span>
                          </label>
                        </div>

                        {/* Dongle Model / Type Input */}
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span className="font-label-sm text-on-surface-variant font-bold">Type:</span>
                          <input
                            type="text"
                            value={slot?.model ?? ''}
                            onChange={(e) => updateSlot(op.key, index, { model: e.target.value })}
                            placeholder="huawei E3531"
                            className="bg-surface-container-lowest text-on-surface font-mono text-label-sm px-2.5 py-1 rounded-lg border border-outline-variant/20 focus:border-primary outline-none w-[130px]"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Action Bar (مطابق لأزرار الأسفل في Image 1) */}
          <div className="flex flex-wrap items-center justify-between gap-space-md p-space-md rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs mt-2">
            <div className="flex items-center gap-2">
              {/* [Détecter automatiquement] Button */}
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={autoDetect.isPending}
                className="flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high text-primary border border-outline-variant/30 font-cairo font-bold text-body-sm transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${autoDetect.isPending ? 'animate-spin' : ''}`}
                >
                  autorenew
                </span>
                <span>Détecter automatiquement (كشف تلقائي)</span>
              </button>
            </div>

            <div className="flex items-center gap-space-sm">
              {/* [Annuler] Button */}
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-cairo font-bold text-body-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
                <span>Annuler (إلغاء)</span>
              </button>

              {/* [Enregistrer] Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveConfig.isPending}
                className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-cairo font-bold text-body-sm transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>Enregistrer (حفظ الإعدادات)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: CODES PIN / TRANSFERT / MONTANT */}
      {/* ========================================================= */}
      {subTab === 'codes' && (
        <div className="flex flex-col gap-space-md">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
            {operatorsList.map((op) => {
              const opSettings = localConfig.operatorSettings[op.key]

              return (
                <div
                  key={op.key}
                  className={`bg-surface-container-lowest rounded-2xl p-space-md border ${op.border} shadow-xs flex flex-col gap-space-sm`}
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
                    <div
                      className={`w-7 h-7 rounded-lg ${op.badgeBg} flex items-center justify-center font-bold font-cairo text-body-sm`}
                    >
                      {op.logoLetter}
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold font-cairo text-on-surface">
                      {op.nameFr} ({op.nameAr})
                    </span>
                  </div>

                  {/* PIN Code */}
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                      رمز PIN للشريحة (Code PIN)
                    </label>
                    <input
                      type="password"
                      value={opSettings?.pinCode ?? '0000'}
                      onChange={(e) => {
                        const updated = { ...localConfig }
                        updated.operatorSettings[op.key].pinCode = e.target.value
                        setLocalConfig(updated)
                      }}
                      maxLength={8}
                      className="bg-surface-container-low text-primary font-mono text-label-lg px-space-sm py-1.5 rounded-xl border border-outline-variant/20 text-center tracking-widest outline-none font-bold"
                      dir="ltr"
                    />
                  </div>

                  {/* USSD Transfer Format */}
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                      صيغة كود التحويل (Format USSD)
                    </label>
                    <input
                      type="text"
                      value={opSettings?.transferFormat ?? ''}
                      onChange={(e) => {
                        const updated = { ...localConfig }
                        updated.operatorSettings[op.key].transferFormat = e.target.value
                        setLocalConfig(updated)
                      }}
                      className="bg-surface-container-low text-primary font-mono text-label-md px-space-sm py-2 rounded-xl border border-outline-variant/20 outline-none"
                      dir="ltr"
                    />
                    <span className="text-[11px] text-on-surface-variant">
                      المتغيرات: <code className="text-primary font-bold">{'{PHONE}'}</code>,{' '}
                      <code className="text-primary font-bold">{'{AMOUNT}'}</code>,{' '}
                      <code className="text-primary font-bold">{'{PIN}'}</code>
                    </span>
                  </div>

                  {/* Balance Check Code */}
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                      كود فحص الرصيد (Code Solde)
                    </label>
                    <input
                      type="text"
                      value={opSettings?.balanceFormat ?? ''}
                      onChange={(e) => {
                        const updated = { ...localConfig }
                        updated.operatorSettings[op.key].balanceFormat = e.target.value
                        setLocalConfig(updated)
                      }}
                      className="bg-surface-container-low text-on-surface font-mono text-label-md px-space-sm py-2 rounded-xl border border-outline-variant/20 outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Min / Max Amounts */}
                  <div className="grid grid-cols-2 gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                        أدنى مبلغ (Min)
                      </label>
                      <input
                        type="number"
                        value={opSettings?.minAmount ?? 100}
                        onChange={(e) => {
                          const updated = { ...localConfig }
                          updated.operatorSettings[op.key].minAmount = parseInt(e.target.value, 10) || 0
                          setLocalConfig(updated)
                        }}
                        className="bg-surface-container-low text-on-surface font-mono text-label-md px-space-sm py-2 rounded-xl border border-outline-variant/20 outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                        أقصى مبلغ (Max)
                      </label>
                      <input
                        type="number"
                        value={opSettings?.maxAmount ?? 50000}
                        onChange={(e) => {
                          const updated = { ...localConfig }
                          updated.operatorSettings[op.key].maxAmount = parseInt(e.target.value, 10) || 50000
                          setLocalConfig(updated)
                        }}
                        className="bg-surface-container-low text-on-surface font-mono text-label-md px-space-sm py-2 rounded-xl border border-outline-variant/20 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveConfig.isPending}
              className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-cairo font-bold text-body-sm transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>حفظ الرموز والإعدادات</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 3: CONFIRMATION (تأكيد التحويل) */}
      {/* ========================================================= */}
      {subTab === 'confirmation' && (
        <div className="flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg border border-outline-variant/20 shadow-xs flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold font-cairo text-on-surface">
                    إعدادات تأكيد العمليات واعتراض استجابات USSD
                  </h3>
                  <p className="font-body-sm text-on-surface-variant">
                    التحقق التلقائي من نجاح العملية واستخراج رقم المعاملة والرصيد المتبقي
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.confirmation.autoConfirm}
                  onChange={(e) => {
                    const updated = { ...localConfig }
                    updated.confirmation.autoConfirm = e.target.checked
                    setLocalConfig(updated)
                  }}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
                <span className="font-cairo font-bold text-body-md text-on-surface">تأكيد تلقائي للعملية</span>
              </label>
            </div>

            {/* Timeout settings */}
            <div className="flex flex-col gap-1 max-w-sm">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                مهلة انتظار استجابة الشبكة (بالثواني)
              </label>
              <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/20 max-w-[200px]" dir="ltr">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={localConfig.confirmation.timeoutSeconds}
                  onChange={(e) => {
                    const updated = { ...localConfig }
                    updated.confirmation.timeoutSeconds = parseInt(e.target.value, 10) || 20
                    setLocalConfig(updated)
                  }}
                  className="w-full bg-transparent text-on-surface font-mono text-label-md outline-none"
                />
                <span className="text-on-surface-variant font-mono text-label-sm ml-2">sec</span>
              </div>
            </div>

            {/* Success Keywords */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                كلمات النجاح في نص الاستجابة (مفصولة بفواصل)
              </label>
              <input
                type="text"
                value={localConfig.confirmation.successKeywords.join(', ')}
                onChange={(e) => {
                  const updated = { ...localConfig }
                  updated.confirmation.successKeywords = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  setLocalConfig(updated)
                }}
                className="bg-surface-container-low text-on-surface font-mono text-body-sm px-3 py-2.5 rounded-xl border border-outline-variant/20 outline-none"
                dir="ltr"
              />
              <span className="text-[11px] text-on-surface-variant">
                مثال: <code>succes, reussie, تم تحويل, تم التحويل, transféré</code>
              </span>
            </div>

            {/* Failure Keywords */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                كلمات الفشل أو الخطأ (مفصولة بفواصل)
              </label>
              <input
                type="text"
                value={localConfig.confirmation.failureKeywords.join(', ')}
                onChange={(e) => {
                  const updated = { ...localConfig }
                  updated.confirmation.failureKeywords = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  setLocalConfig(updated)
                }}
                className="bg-surface-container-low text-on-surface font-mono text-body-sm px-3 py-2.5 rounded-xl border border-outline-variant/20 outline-none"
                dir="ltr"
              />
              <span className="text-[11px] text-on-surface-variant">
                مثال: <code>echec, refuse, خطأ, فشل, solde insuffisant, incorrect</code>
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveConfig.isPending}
              className="flex items-center gap-2 px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-cairo font-bold text-body-sm transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>حفظ إعدادات التأكيد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
