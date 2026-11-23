import React, { useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { FiMail, FiLock, FiSun, FiMoon } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useTheme } from '../contexts/ThemeContext'
import { useLoading } from '../contexts/LoadingContext'
import { useAuth } from '../contexts/AuthContext'
import { loginSchema } from '../utils/validation'

const Login = () => {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { triggerFirstLoginLoading } = useLoading()
  const { login, verifyTwoFactor, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  // { token, remember } while the authenticator code is asked for
  const [twoFactor, setTwoFactor] = useState(null)
  const [code, setCode] = useState('')
  const [googleWaiting, setGoogleWaiting] = useState(false)
  const googleCancelled = useRef(false)
  const cancelGoogle = () => { googleCancelled.current = true }

  // Check for success message from reset password
  const successMessage = location.state?.message

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    setServerError('')

    const result = await login(data, data.rememberMe)

    if (result.verify) {
      // not verified yet: the server has just emailed a new code
      navigate('/verify-email', { state: { email: result.verify, sent: true } })
      return
    }
    if (result.twoFactor) {
      setTwoFactor({ token: result.twoFactor, remember: data.rememberMe })
      setIsSubmitting(false)
      return
    }
    if (result.success) {
      // One animation, then the dashboard: the overlay (LoadingProvider, above
      // every route) plays while the dashboard mounts underneath, so when it
      // ends the dashboard is already there. Navigating after a timer of the
      // same length raced the overlay and briefly showed this page again.
      triggerFirstLoginLoading()
      navigate('/dashboard', { replace: true })
    } else {
      setServerError(result.error)
      setIsSubmitting(false)
    }
  }

  const onSubmitCode = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError('')
    const result = await verifyTwoFactor(twoFactor.token, code, twoFactor.remember)
    if (result.success) {
      triggerFirstLoginLoading()
      navigate('/dashboard', { replace: true })
    } else {
      setServerError(result.error)
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setServerError('')
    googleCancelled.current = false
    setGoogleWaiting(true)
    const remember = !!document.querySelector('input[name="rememberMe"]')?.checked
    const result = await loginWithGoogle(remember, () => googleCancelled.current)
    setGoogleWaiting(false)
    if (result.success) {
      triggerFirstLoginLoading()
      navigate('/dashboard', { replace: true })
    } else if (result.twoFactor) {
      setTwoFactor({ token: result.twoFactor, remember })
    } else if (!result.cancelled) {
      setServerError(result.error)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-3 rounded-lg shadow-lg hover:shadow-xl transition-all z-10 cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        }}
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <FiSun className="text-2xl" style={{ color: 'var(--text-primary)' }} />
        ) : (
          <FiMoon className="text-2xl" style={{ color: 'var(--primary)' }} />
        )}
      </button>

      {/* Login Card */}
      <div
        className="p-8 rounded-xl shadow-lg max-w-md w-full transition-colors duration-300"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: `1px solid var(--border-color)`,
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4 transition-colors duration-300"
            style={{ backgroundColor: '#0A2F44' }}
          >
            <span className="text-white text-2xl font-bold">SDH</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome to Sphere Design Hub
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Success message from reset password */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {/* Server error message */}
        {serverError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {serverError}
          </div>
        )}

        {twoFactor && (
          <form onSubmit={onSubmitCode} className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Two-step verification is on for this account. Enter the 6-digit code from your
              authenticator app, or one of your recovery codes.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Authentication code"
              aria-label="Authentication code"
              className="w-full px-4 py-3 rounded-lg tracking-widest text-center font-mono"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <button
              type="submit"
              disabled={isSubmitting || code.trim().length < 6}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0A2F44' }}
            >
              {isSubmitting ? 'Checking...' : 'Verify and sign in'}
            </button>
            <button type="button" onClick={() => { setTwoFactor(null); setCode(''); setServerError('') }}
              className="w-full text-sm hover:underline" style={{ color: 'var(--accent)' }}>
              Back to sign in
            </button>
          </form>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" hidden={!!twoFactor}>
          {/* Email Field */}
          <div className="relative">
            <FiMail
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              autoComplete="username"
              {...register('email')}
              placeholder="Email or username"
              aria-label="Email or username"
              className="w-full pl-10 pr-4 py-3 rounded-lg transition-colors duration-300"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: `1px solid ${errors.email ? '#ef4444' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}

          {/* Password Field */}
          <div className="relative">
            <FiLock
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="password"
              {...register('password')}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-3 rounded-lg transition-colors duration-300"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: `1px solid ${errors.password ? '#ef4444' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
          )}

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded transition-colors duration-300"
                style={{ accentColor: '#0A2F44' }}
              />
              <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm hover:underline transition-colors duration-300"
              style={{ color: 'var(--accent)' }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0A2F44' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* OAuth Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full border-t transition-colors duration-300"
                style={{ borderColor: 'var(--border-color)' }}
              ></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className="px-2 transition-colors duration-300"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                }}
              >
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            {googleWaiting ? (
              <div className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <span role="status">Waiting for Google… finish in the pop-up window.</span>
                <button type="button" onClick={cancelGoogle} className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors duration-300 hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: `1px solid var(--border-color)`,
                  color: 'var(--text-secondary)',
                }}
              >
                <FcGoogle className="text-xl" />
                <span>Continue with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Sign up link */}
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium hover:underline transition-all duration-200"
              style={{ color: 'var(--accent)' }}
            >
              Sign up
            </Link>
          </p>
          {/* Plain link (not <Link>): /about is a prerendered public page outside the app */}
          <a
            href="/about"
            className="mt-3 inline-block text-sm hover:underline transition-colors duration-300"
            style={{ color: 'var(--text-muted)' }}
          >
            About Sphere Design Hub
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login
