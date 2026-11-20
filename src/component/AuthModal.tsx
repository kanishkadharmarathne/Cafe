import { useState } from 'react'
import { createPortal } from 'react-dom'
import './AuthModal.css'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  initialMode: 'login' | 'signup'
  onClose: () => void
  onSuccess: (name: string) => void
}

export default function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [authError, setAuthError] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  function validateLogin() {
    const e: Record<string, string> = {}
    if (!loginForm.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(loginForm.email)) e.email = 'Enter a valid email'
    if (!loginForm.password) e.password = 'Password is required'
    return e
  }

  function validateSignup() {
    const e: Record<string, string> = {}
    if (!signupForm.name.trim()) e.name = 'Name is required'
    if (!signupForm.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(signupForm.email)) e.email = 'Enter a valid email'
    if (!signupForm.password) e.password = 'Password is required'
    else if (signupForm.password.length < 8) e.password = 'Minimum 8 characters'
    if (signupForm.confirm !== signupForm.password) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateLogin()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setAuthError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })
    setLoading(false)
    if (error) { setAuthError(error.message); return }
    const name = data.user?.user_metadata?.name || data.user?.email || 'User'
    setResolvedName(name)
    setSubmitted(true)
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateSignup()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setAuthError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: { data: { name: signupForm.name } },
    })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('over_email_send_rate_limit')) {
        setAuthError('Too many sign-up attempts. Please wait a few minutes and try again.')
      } else {
        setAuthError(error.message)
      }
      return
    }
    setResolvedName(signupForm.name)
    // If no session returned, Supabase requires email confirmation
    setNeedsConfirmation(!data.session)
    setSubmitted(true)
  }

  function switchMode(m: 'login' | 'signup') {
    setMode(m)
    setErrors({})
    setSubmitted(false)
    setShowPassword(false)
    setAuthError('')
  }

  function handleContinue() {
    onSuccess(resolvedName)
    onClose()
  }

  const modal = (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Log In' : 'Sign Up'}>

        {/* Close */}
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Logo */}
        <div className="auth-logo">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <span className="auth-logo-name">Taste of Ceylon</span>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* ── Login form ── */}
        {mode === 'login' && (
          submitted ? (
            <div className="auth-success">
              <span>✓</span>
              <h3>Welcome back!</h3>
              <p>You've successfully logged in.</p>
              <button className="auth-submit" onClick={handleContinue}>Continue</button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="auth-error">{errors.email}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="login-password">
                  Password
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="auth-error">{errors.password}</span>}
              </div>

              <div className="auth-forgot">
                <button type="button" className="auth-link">Forgot password?</button>
              </div>

              {authError && <p className="auth-error auth-error-global">{authError}</p>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Log In'}
              </button>

              <p className="auth-switch">
                Don't have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                  Sign Up
                </button>
              </p>
            </form>
          )
        )}

        {/* ── Signup form ── */}
        {mode === 'signup' && (
          submitted ? (
            needsConfirmation ? (
              <div className="auth-success">
                <span>📧</span>
                <h3>Check your email!</h3>
                <p>We've sent a confirmation link to <strong>{signupForm.email}</strong>.</p>
                <p className="auth-confirm-hint">Please confirm your email before logging in.</p>
                <button className="auth-submit" onClick={onClose}>Got it</button>
              </div>
            ) : (
            <div className="auth-success">
              <span>✓</span>
              <h3>Account created!</h3>
              <p>Welcome to Taste of Ceylon.</p>
              <button className="auth-submit" onClick={handleContinue}>Get Started</button>
            </div>
            )
          ) : (
            <form className="auth-form" onSubmit={handleSignupSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="signup-name">Name</label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="auth-error">{errors.name}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="auth-error">{errors.email}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-password">
                  Password
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="auth-error">{errors.password}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-confirm">Confirm Password</label>
                <input
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  value={signupForm.confirm}
                  onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                  className={errors.confirm ? 'error' : ''}
                />
                {errors.confirm && <span className="auth-error">{errors.confirm}</span>}
              </div>

              {authError && <p className="auth-error auth-error-global">{authError}</p>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                  Log In
                </button>
              </p>
            </form>
          )
        )}

      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
