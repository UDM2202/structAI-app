// src/pages/VerifyEmail.jsx
// After sign-up (or signing in to an unverified account) the server emails a
// 6-digit code; entering it activates the account and signs in.
import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiMail, FiHash } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useLoading } from '../contexts/LoadingContext'

const RESEND_WAIT = 60 // the server refuses a new code within a minute

export default function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth()
  const { triggerFirstLoginLoading } = useLoading()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.sent ? 'We have emailed you a 6-digit code. It is valid for 10 minutes.' : '')
  const [wait, setWait] = useState(location.state?.sent ? RESEND_WAIT : 0)

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    const r = await verifyEmail(email, code)
    if (r.success) {
      triggerFirstLoginLoading()
      navigate('/dashboard', { replace: true })
    } else {
      setError(r.error)
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(''); setNotice('')
    const r = await resendVerification(email)
    if (r.success) { setNotice('A new code is on its way.'); setWait(RESEND_WAIT) }
    else setError(r.error)
  }

  const input = 'w-full pl-10 pr-4 py-3 rounded-lg transition-colors duration-300'
  const inputStyle = { backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
  const validEmail = /\S+@\S+\.\S+/.test(email)

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-8 rounded-xl shadow-lg max-w-md w-full" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <Link to="/login" className="inline-flex items-center text-sm hover:underline mb-6" style={{ color: 'var(--accent)' }}>
          <FiArrowLeft className="mr-2" /> Back to login
        </Link>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#0A2F44' }}>
            <span className="text-white text-2xl font-bold">SDH</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Verify your email</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter the code we sent to your email address to activate your account.
          </p>
        </div>

        {notice && <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm" role="status">{notice}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm" role="alert">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" aria-label="Email address" className={input} style={inputStyle} />
          </div>
          <div className="relative">
            <FiHash className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input autoFocus={!!email} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code" aria-label="6-digit code" className={`${input} tracking-[0.4em] font-mono`} style={inputStyle} />
          </div>
          <button type="submit" disabled={busy || code.length !== 6 || !validEmail}
            className="w-full text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0A2F44' }}>
            {busy ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          No email? Check your spam folder, or{' '}
          <button type="button" onClick={resend} disabled={wait > 0 || !validEmail}
            className="font-medium hover:underline disabled:no-underline disabled:opacity-60" style={{ color: 'var(--accent)' }}>
            {wait > 0 ? `send a new code in ${wait} s` : 'send a new code'}
          </button>
        </p>
      </div>
    </div>
  )
}
