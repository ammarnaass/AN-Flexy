import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useSettingsList, useSetSetting, settingsMessages } from '@renderer/features/settings'
import { useOperators, useUpdateOperatorMargin, useDisableOperator } from '@renderer/features/operators'
import { useUsers } from '@renderer/features/auth'
import { useBackups, useCreateBackup, useRestoreBackup, backupMessages } from '@renderer/features/backup'
import { ui } from '@renderer/shared/messages.ar'
import {
  IconSettings,
  IconSignal,
  IconCustomers,
  IconBackup,
  IconInfo,
} from '@renderer/shared/ui/icons'

type TabType = 'general' | 'operators' | 'users' | 'backup' | 'about'

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('general')

  // إعدادات عامة
  const settingsList = useSettingsList()
  const setSetting = useSetSetting()
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [generalSaved, setGeneralSaved] = useState(false)

  useEffect(() => {
    if (settingsList.data) {
      const name = settingsList.data.find((s) => s.key === 'shop_name')?.value ?? ''
      const phone = settingsList.data.find((s) => s.key === 'shop_phone')?.value ?? ''
      setShopName(name)
      setShopPhone(phone)
    }
  }, [settingsList.data])

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault()
    if (shopName.trim()) {
      await setSetting.mutateAsync({ key: 'shop_name', value: shopName.trim() })
    }
    if (shopPhone.trim()) {
      await setSetting.mutateAsync({ key: 'shop_phone', value: shopPhone.trim() })
    }
    setGeneralSaved(true)
    setTimeout(() => setGeneralSaved(false), 3000)
  }

  // المتعاملون
  const operators = useOperators()
  const updateMargin = useUpdateOperatorMargin()
  const disableOp = useDisableOperator()
  const [editingOpId, setEditingOpId] = useState<number | null>(null)
  const [newMarginPercent, setNewMarginPercent] = useState('')

  const handleSaveMargin = (id: number) => {
    const percent = parseFloat(newMarginPercent)
    if (isNaN(percent) || percent < 0 || percent > 100) return
    const marginBp = Math.round(percent * 100)
    updateMargin.mutate(
      { id, marginBp },
      {
        onSuccess: () => {
          setEditingOpId(null)
          setNewMarginPercent('')
        },
      },
    )
  }

  // المستخدمون
  const users = useUsers()

  // النسخ الاحتياطي
  const backups = useBackups()
  const createBackup = useCreateBackup()
  const restoreBackup = useRestoreBackup()
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<string | null>(null)

  const handleCreateBackup = () => {
    createBackup.mutate()
  }

  const handleConfirmRestore = () => {
    if (!confirmRestoreFile) return
    restoreBackup.mutate(
      { filename: confirmRestoreFile },
      {
        onSuccess: () => {
          setConfirmRestoreFile(null)
        },
      },
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: settingsMessages.tabs.general, icon: <IconSettings size={16} /> },
    { id: 'operators', label: settingsMessages.tabs.operators, icon: <IconSignal size={16} /> },
    { id: 'users', label: settingsMessages.tabs.users, icon: <IconCustomers size={16} /> },
    { id: 'backup', label: settingsMessages.tabs.backup, icon: <IconBackup size={16} /> },
    { id: 'about', label: settingsMessages.tabs.about, icon: <IconInfo size={16} /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{settingsMessages.title}</h1>
        <p className="text-sm text-neutral-400">{settingsMessages.subtitle}</p>
      </div>

      {/* التبويبات العلوية */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-neutral-800 text-emerald-400 shadow-md ring-1 ring-neutral-700'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
        {/* 1. إعدادات عامة */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="max-w-lg space-y-4">
            <h2 className="text-lg font-bold text-neutral-200">{settingsMessages.tabs.general}</h2>

            <div className="space-y-2">
              <label htmlFor="setting-shop-name" className="block text-xs font-medium text-neutral-300">
                {settingsMessages.general.shopName}
              </label>
              <input
                id="setting-shop-name"
                type="text"
                placeholder="اسم المحل (مثل: فليكسي عمّار)"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="setting-shop-phone" className="block text-xs font-medium text-neutral-300">
                {settingsMessages.general.shopPhone}
              </label>
              <input
                id="setting-shop-phone"
                type="text"
                dir="ltr"
                placeholder="05 / 06 / 07..."
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
              />
            </div>

            {generalSaved && (
              <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                {settingsMessages.general.saved}
              </p>
            )}

            <button
              type="submit"
              disabled={setSetting.isPending}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
            >
              {setSetting.isPending ? ui.loading : settingsMessages.general.save}
            </button>
          </form>
        )}

        {/* 2. المتعاملون */}
        {activeTab === 'operators' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-200">{settingsMessages.operators.title}</h2>
            {operators.isLoading ? (
              <p className="text-xs text-neutral-400">{ui.loading}</p>
            ) : (
              <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-950/60">
                {operators.data?.map((op) => (
                  <div key={op.id} className="flex flex-wrap items-center justify-between p-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-100">{op.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            op.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {op.active ? settingsMessages.operators.activeYes : settingsMessages.operators.activeNo}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-400">
                        الهامش الحالي:{' '}
                        <strong className="text-neutral-200">{(op.marginBp / 100).toFixed(2)}%</strong> (
                        {op.marginBp} نقطة أساس)
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {editingOpId === op.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.05"
                            placeholder="%"
                            dir="ltr"
                            value={newMarginPercent}
                            onChange={(e) => setNewMarginPercent(e.target.value)}
                            className="w-20 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveMargin(op.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingOpId(null)}
                            className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOpId(op.id)
                            setNewMarginPercent((op.marginBp / 100).toString())
                          }}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:border-emerald-500"
                        >
                          تعديل الهامش
                        </button>
                      )}

                      {op.active && (
                        <button
                          type="button"
                          disabled={disableOp.isPending}
                          onClick={() => disableOp.mutate(op.id)}
                          className="rounded-lg bg-red-950/60 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/60"
                        >
                          تعطيل
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. المستخدمون */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-200">{settingsMessages.users.title}</h2>
            {users.isLoading ? (
              <p className="text-xs text-neutral-400">{ui.loading}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-3">{settingsMessages.users.name}</th>
                      <th className="p-3">{settingsMessages.users.role}</th>
                      <th className="p-3">{settingsMessages.users.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {users.data?.map((u) => (
                      <tr key={u.id}>
                        <td className="p-3 font-semibold text-neutral-200">{u.name}</td>
                        <td className="p-3 text-neutral-400">
                          {u.role === 'admin'
                            ? settingsMessages.users.roleAdmin
                            : settingsMessages.users.roleCashier}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              u.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {u.active ? settingsMessages.users.active : settingsMessages.users.inactive}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. النسخ الاحتياطي */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-200">{backupMessages.title}</h2>
                <p className="text-xs text-neutral-400">{backupMessages.subtitle}</p>
              </div>

              <button
                type="button"
                disabled={createBackup.isPending}
                onClick={handleCreateBackup}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
              >
                <IconBackup size={16} />
                <span>{createBackup.isPending ? backupMessages.creating : backupMessages.createNow}</span>
              </button>
            </div>

            {createBackup.isSuccess && (
              <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                {backupMessages.createSuccess}
              </p>
            )}

            {restoreBackup.isSuccess && (
              <p className="rounded-xl border border-teal-800 bg-teal-950/40 p-3 text-xs text-teal-300">
                {backupMessages.restoreSuccess}
              </p>
            )}

            {backups.isLoading ? (
              <p className="text-xs text-neutral-400">{ui.loading}</p>
            ) : backups.data && backups.data.length === 0 ? (
              <p className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-6 text-center text-xs text-neutral-500">
                {backupMessages.empty}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-3">{backupMessages.table.filename}</th>
                      <th className="p-3">{backupMessages.table.size}</th>
                      <th className="p-3">{backupMessages.table.date}</th>
                      <th className="p-3 text-left">{backupMessages.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {backups.data?.map((b) => (
                      <tr key={b.filename} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-semibold text-neutral-200 font-sans">{b.filename}</td>
                        <td className="p-3 text-neutral-400">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3 text-neutral-400 font-sans">
                          {new Date(b.createdAt).toLocaleString('ar-DZ')}
                        </td>
                        <td className="p-3 text-left font-sans">
                          <button
                            type="button"
                            onClick={() => setConfirmRestoreFile(b.filename)}
                            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:border-amber-500 hover:text-amber-300"
                          >
                            {backupMessages.restore}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. حول التطبيق */}
        {activeTab === 'about' && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-bold text-neutral-200">{settingsMessages.about.appName}</h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">{settingsMessages.about.versionLabel}</span>
                <span className="font-mono text-emerald-400">{settingsMessages.about.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">{settingsMessages.about.stackLabel}</span>
                <span className="font-mono text-neutral-300">{settingsMessages.about.stack}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">{settingsMessages.about.developerLabel}</span>
                <span className="text-neutral-200">{settingsMessages.about.developer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">{settingsMessages.about.licenseLabel}</span>
                <span className="text-neutral-200">{settingsMessages.about.license}</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">{settingsMessages.about.description}</p>
          </div>
        )}
      </div>

      {/* نافذة تأكيد الاسترجاع */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-amber-400">{backupMessages.confirmModalTitle}</h3>
            <p className="text-xs leading-relaxed text-neutral-300">{backupMessages.restoreConfirm}</p>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs font-mono text-neutral-300">
              {confirmRestoreFile}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreFile(null)}
                className="rounded-xl px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200"
              >
                {ui.cancel}
              </button>
              <button
                type="button"
                disabled={restoreBackup.isPending}
                onClick={handleConfirmRestore}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {restoreBackup.isPending ? backupMessages.restoring : backupMessages.confirmRestoreButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
