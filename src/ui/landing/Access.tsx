import { FormEvent, useState } from 'react'
import { useApp } from '../store'
import { Badge, Button } from '../components'
import { CREDENTIALS, DEMO_PASSWORD } from '../../access/credentials'

/**
 * Client Access (Addendum F §2, reframed by G §8): a branded login with a
 * visible reviewer-access panel. One click signs
 * in as any segment; each credential sets the RBAC role and loads that
 * persona's dataset scope.
 */
export default function Access() {
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (asEmail?: string) => {
    setBusy(true)
    setError(null)
    const failure = await login(asEmail ?? email, asEmail ? DEMO_PASSWORD : password)
    setBusy(false)
    if (failure) setError(failure)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void signIn()
  }

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-5 gap-10 py-14">
      <div className="col-span-2">
        <h1 className="text-2xl font-semibold tracking-tight">Client Access</h1>
        <p className="mt-2 text-sm text-greyx">
          Sign in to your portfolio. Sessions are scoped to your organisation and role.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-[0.14em] text-greyx">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full border rule bg-white/50 px-3 py-2 outline-none focus:border-ink"
              placeholder="you@organisation.eu"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[10px] uppercase tracking-[0.14em] text-greyx">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full border rule bg-white/50 px-3 py-2 outline-none focus:border-ink"
              placeholder="••••••••"
            />
          </label>
          {error && <div className="text-xs text-[#B4392E]">{error}</div>}
          <Button tone="primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      <div className="col-span-3 border rule bg-white/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-greyx">Reviewer access</h2>
          <Badge tone="brass">
            password: {DEMO_PASSWORD}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-greyx">
          Enter any client workspace with one click — each sign-in scopes the session to that
          organisation's role and data.
        </p>
        <div className="mt-4 divide-y rule">
          {CREDENTIALS.map((c) => (
            <div key={c.email} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.label}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-greyx">
                  <span className="font-mono">{c.email}</span>
                  <Badge tone="grey">{c.role.replace('_', ' ')}</Badge>
                  <span>→ {c.landsOn}</span>
                </div>
              </div>
              <Button tone="quiet" disabled={busy} onClick={() => void signIn(c.email)}>
                Sign in as
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
