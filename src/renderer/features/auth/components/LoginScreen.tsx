import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useHasUsers, useLogin, useSetupOwner } from '../hooks'
import { translateAuthError } from '../errors'
import { authMessages } from '../messages.ar'
import { ui } from '@renderer/shared/messages.ar'

// شاشة الدخول: تعرض معالج إنشاء المالك عند أول تشغيل، أو نموذج الدخول بعد ذلك.
export function LoginScreen() {
  const hasUsers = useHasUsers()

  if (hasUsers.isLoading) {
    return (
      <AuthShell>
        <p className="py-8 text-center text-neutral-400">{ui.loading}</p>
      </AuthShell>
    )
  }

  return hasUsers.data && !hasUsers.data.hasUsers ? <SetupForm /> : <LoginForm />
}

function useAuthForm() {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  return { name, setName, pin, setPin }
}

// غلاف موحّد: خلفية متدرجة + بطاقة بهوية التطبيق (PRD §9: واجهة نظيفة لرجل مشغول).
function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-emerald-950/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7"
              aria-hidden
            >
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M11 18h2" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-neutral-50">{ui.appName}</p>
            <p className="text-xs text-neutral-400">{authMessages.tagline}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoFocus,
  inputMode,
  placeholder,
  hint,
  centered,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoFocus?: boolean
  inputMode?: 'text' | 'numeric'
  placeholder?: string
  hint?: string
  centered?: boolean
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-neutral-700 bg-neutral-950/60 px-3.5 py-2.5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 ${
          centered ? 'text-center text-lg tracking-[0.3em]' : ''
        }`}
      />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  )
}

function SubmitButton({
  disabled,
  pending,
  label,
  pendingLabel,
}: {
  disabled: boolean
  pending: boolean
  label: string
  pendingLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-center text-sm text-red-300">
      {message}
    </p>
  )
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
    </div>
  )
}

function LoginForm() {
  const { name, setName, pin, setPin } = useAuthForm()
  const login = useLogin()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ name, pin })
  }

  return (
    <AuthShell>
      <Header title={authMessages.loginTitle} subtitle={authMessages.loginSubtitle} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          id="login-name"
          label={authMessages.name}
          value={name}
          onChange={setName}
          placeholder={authMessages.namePlaceholder}
          autoFocus
        />
        <Field
          id="login-pin"
          label={authMessages.pin}
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
          type="password"
          inputMode="numeric"
          placeholder={authMessages.pinPlaceholder}
          hint={authMessages.pinHint}
          centered
        />
        {login.isError && <ErrorBanner message={translateAuthError(login.error)} />}
        <SubmitButton
          disabled={name.length === 0 || pin.length < 4}
          pending={login.isPending}
          label={authMessages.loginAction}
          pendingLabel={authMessages.signingIn}
        />
      </form>
    </AuthShell>
  )
}

function SetupForm() {
  const { name, setName, pin, setPin } = useAuthForm()
  const setup = useSetupOwner()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setup.mutate({ name, pin })
  }

  return (
    <AuthShell>
      <Header title={authMessages.setupTitle} subtitle={authMessages.setupHint} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          id="setup-name"
          label={authMessages.name}
          value={name}
          onChange={setName}
          placeholder={authMessages.namePlaceholder}
          autoFocus
        />
        <Field
          id="setup-pin"
          label={authMessages.pin}
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
          type="password"
          inputMode="numeric"
          placeholder={authMessages.pinPlaceholder}
          hint={authMessages.pinHint}
          centered
        />
        {setup.isError && <ErrorBanner message={translateAuthError(setup.error)} />}
        <SubmitButton
          disabled={name.length === 0 || pin.length < 4}
          pending={setup.isPending}
          label={authMessages.setupAction}
          pendingLabel={authMessages.signingIn}
        />
      </form>
    </AuthShell>
  )
}
