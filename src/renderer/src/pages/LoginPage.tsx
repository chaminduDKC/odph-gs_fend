import React, { useState } from 'react'
import { Wrench, Eye, EyeOff, CheckCircle, User, Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ErrorMessage } from '../components/ErrorMessage'

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const login = useAuthStore(state => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ username, password })
    } catch (err: any) {
      if(err.response.status === 503){
        setError(err.response.data.error)
      } else {
        setError(err.response?.data?.message || 'Failed to connect to server. Please check your credentials.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = ['Repair Job Tracking', 'Inventory Management', 'Worker Payroll', 'Financial Reports']

  return (
    <div className="flex h-screen w-full bg-(--color-bg-primary) overflow-hidden">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-center px-20 py-20 w-1/2 bg-linear-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border-r border-[var(--color-border)] relative">
        {/* Blueprint grid backdrop — CSS only, no external image */}
        <div className="absolute inset-0 blueprint-grid pointer-events-none" />

        {/* Corner-bracket viewfinder frame — the signature element */}
        <div className="absolute inset-10 pointer-events-none">
          <span className="corner-bracket corner-bracket-tl" />
          <span className="corner-bracket corner-bracket-br" />
        </div>

        <div className="z-10 animate-fade-in">
          {/* System status readout */}
          <div className="flex items-center gap-2 mb-10">
            <span className="status-dot" />
            <span className="mono text-xs tracking-widest text-(--color-text-muted) uppercase">
              System Online
            </span>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[var(--color-accent)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
              <Wrench size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-none">ODPH</h1>
              <p className="mono text-xs tracking-[0.2em] text-[var(--color-text-muted)] uppercase mt-1">
                Garage Management System
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
            Restore. Shine. Drive<br />
            <span className="text-[var(--color-accent)]">floor to finish.</span>
          </h2>

          <p className="text-[var(--color-text-secondary)] text-lg mb-10 max-w-md">
            Streamline your workflow, manage inventory, track repairs, and analyze finances all in one place.
          </p>

          {/* Feature manifest — spec-sheet style, not arbitrary numbering */}
          <div className="border-t border-[var(--color-border)]">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-[var(--color-border)] text-white/80"
              >
                <CheckCircle size={18} className="text-[var(--color-success)] shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-[var(--color-bg-primary)] relative">
        <div className="absolute inset-0 blueprint-grid opacity-40 pointer-events-none lg:hidden" />

        <div className="w-full max-w-md glass-card login-card rounded-2xl shadow-2xl animate-fade-in relative z-10">
          {/* Top accent bar */}
          <div className="h-1 w-full rounded-t-2xl bg-[var(--color-accent)]" />

          <div className="p-10">
            <div className="text-center mb-8">
              <p className="mono text-xs tracking-[0.2em] text-[var(--color-accent)] uppercase mb-2">
                Terminal Access
              </p>
              <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
              <p className="text-[var(--color-text-secondary)]">Sign in to your account to continue</p>
            </div>

            <ErrorMessage message={error} />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg pl-11 pr-11 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-3 rounded-lg text-base font-semibold shadow-lg shadow-[var(--color-accent)]/20 flex justify-center items-center transition-transform active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex items-center justify-center gap-2">
              <span className="status-dot status-dot-sm" />
              <span className="mono text-xs text-center text-[var(--color-text-muted)]">
                ODPH Desktop Client v1.0.0 &copy; 2026 Developed By
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}