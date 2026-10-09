import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn, ShieldCheck, Sparkles, KeyRound, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  function onSubmit(e) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) setError(result.error)
    else setError('')
  }

  return (
    <div className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <div className="login-grain" aria-hidden="true" />

      <div className="login-shell">
        <section className="login-hero" aria-label="Brand">
          <div className="login-hero-inner">
            <div className="login-mark login-mark-lg" aria-hidden="true">
              D
            </div>
            <p className="login-eyebrow">AI sales control</p>
            <h1 className="login-hero-title">Desk &amp; Day</h1>
            <p className="login-hero-lead">
              Train the assistant, manage leads, and tune the storefront chat from one calm admin
              workspace.
            </p>
            <ul className="login-points">
              <li>
                <Sparkles size={16} aria-hidden="true" />
                Live chat &amp; lead overview
              </li>
              <li>
                <ShieldCheck size={16} aria-hidden="true" />
                Knowledge &amp; training tools
              </li>
            </ul>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
            <header className="login-panel-head">
              <h2>Welcome back</h2>
              <p>Sign in to manage chats, leads, and training</p>
            </header>

            <form className="login-form" onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <div className="input-wrap">
                  <Mail size={16} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@store.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <KeyRound size={16} aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="error-text" role="alert">
                  {error}
                </div>
              )}

              <button className="btn-primary login-submit" type="submit">
                <LogIn size={17} aria-hidden="true" />
                Sign in
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
