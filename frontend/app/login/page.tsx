'use client'
import { useState, Suspense } from 'react'
import { authJsonHeaders } from '@/lib/auth-fetch'
import { supabase } from '@/lib/supabase'
import LegalConsent from '@/app/components/LegalConsent'
import { LEGAL_VERSION } from '@/lib/legal'
import { recordGuestLegal } from '@/lib/legal-client'
import { clearOAuthNextHint, getAuthCallbackUrl, safeInternalPath, setOAuthNextHint } from '@/lib/auth-redirect'
import { useRouter, useSearchParams } from 'next/navigation'
import { finishPendingManager, isEmailNotConfirmed } from '@/lib/auth-flows'

const NOTICES: Record<string, string> = {
  confirmed_elsewhere: 'We couldn\'t finish signing you in on this device. If you just confirmed your email, it\'s confirmed — sign in below. If you started a rating before signing up, it\'s saved in the browser where you started it: sign in there to post it.',
  password_updated: 'Password updated. Sign in with your new password.',
}
const ERRORS: Record<string, string> = {
  // A used confirmation link usually means the email is already confirmed (e.g. a mail
  // scanner or a second tap opened it first), so point people to sign in.
  link_invalid: 'This link has already been used or has expired. If you already confirmed your email, sign in below.',
  auth_failed: 'Sign in didn\'t complete. Please try again.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(ERRORS[searchParams.get('error') ?? ''] ?? '')
  const [forgotSent, setForgotSent] = useState(false)
  const [legalAccepted, setLegalAccepted] = useState(false)
  // Messages carried in the URL from email links and redirects (fixed text only).
  const [info, setInfo] = useState(NOTICES[searchParams.get('notice') ?? ''] ?? '')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  // Email-confirmation sign-up that started from a rating: say where the draft lives.
  const [draftDeviceNote, setDraftDeviceNote] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      setNeedsConfirm(false)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (isEmailNotConfirmed(error)) {
        setNeedsConfirm(true)
        setError('Please confirm your email first. Check your inbox for the link from Slate.')
        return
      }
      if (error) { setError(error.message); return }
      if (!data.user?.id) { setError('Sign in did not return a user.'); return }

      // Managers first (same order as /auth/callback + Navbar). Also finishes a
      // restaurant sign-up whose account was confirmed by email.
      const managerRow = await finishPendingManager(supabase, data.user)
      // A safe return path beats the role dashboard. Signup does not use this.
      const next = safeInternalPath(searchParams.get('redirect'))

      if (managerRow) {
        localStorage.setItem('slateUserType', 'manager')
        localStorage.setItem('slateManagerId', managerRow.id)
        localStorage.setItem('slateRestaurantName', managerRow.restaurant_name)
        router.push(next ?? '/restaurant/dashboard')
        return
      }

      const { data: serverRow } = await supabase
        .from('servers')
        .select('id')
        .eq('wallet_address', data.user.id)
        .maybeSingle()
      if (serverRow) {
        localStorage.setItem('slateServerId', serverRow.id)
        localStorage.setItem('slateUserType', 'server')
        router.push(next ?? '/dashboard')
        return
      }

      // Started a server signup but the profile was never saved — finish it.
      if (data.user.user_metadata?.signup_role === 'server') {
        router.push('/servers/signup')
        return
      }

      localStorage.setItem('slateUserType', 'guest')
      router.push(next ?? '/live')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!legalAccepted) { setError('Please confirm you agree to the Terms of Service and Privacy Policy.'); return }
    setLoading(true)
    setError('')
    const next = safeInternalPath(searchParams.get('redirect'))
    // If "Confirm email" is on, the confirmation link brings them back here (same browser).
    if (next) setOAuthNextHint(next, 3600)
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: getAuthCallbackUrl() },
    })
    if (error) { setError(error.message); setLoading(false); return }
    // With email confirmation on, there is no session until the link is clicked; the
    // tick is then asked for again (and recorded) at the first rating or follow.
    if (!signUpData.session) {
      setLoading(false)
      setMode('signin')
      setInfo(`Check ${email} for a confirmation link from Slate, then sign in here.`)
      if (searchParams.get('from') === 'rate') setDraftDeviceNote(true)
      return
    }
    clearOAuthNextHint() // signed in already; no email link will need it
    // Record the ticked acknowledgment on the server (version + time). If this fails,
    // rating and following still require it, so nothing is used without agreement.
    {
      const legalErr = await recordGuestLegal(signUpData.session.access_token)
      if (legalErr) console.error('[login] could not record acknowledgment:', legalErr)
    }
    localStorage.setItem('slateUserType', 'guest')
    // Send welcome email — fire and forget. The route sends only to the signed-in
    // user's own address, so it needs the new session (absent if email
    // confirmation is required; then no welcome email is sent).
    const welcomeToken = signUpData.session?.access_token
    if (welcomeToken) {
      authJsonHeaders(welcomeToken).then(headers => fetch('/api/welcome-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name || email }),
      })).catch(() => {})
    }
    router.push(next ?? '/live')
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl(),
    })
    if (!error) {
      setForgotSent(true)
    }
  }

  const resendConfirmation = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: getAuthCallbackUrl() } })
    setNeedsConfirm(false)
    if (error) { setError(error.message); return }
    setError('')
    setInfo(`Confirmation email sent to ${email}.`)
  }

  const handleGoogle = async () => {
    if (mode === 'signup') {
      if (!legalAccepted) { setError('Please confirm you agree to the Terms of Service and Privacy Policy.'); return }
      // The callback records this after Google returns (short-lived, callback path only).
      document.cookie = `slate_legal_guest=${LEGAL_VERSION}; path=/auth/callback; max-age=600; samesite=lax`
    }
    const next = safeInternalPath(searchParams.get('redirect'))
    if (next) setOAuthNextHint(next)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthCallbackUrl(),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError('Google sign in failed. Please try email and password instead.')
      console.error('Google OAuth error:', error)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#444', marginBottom: '16px', textTransform: 'uppercase' }}>Slate</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: 'white', marginBottom: '8px', fontWeight: '400' }}>
            {mode === 'signin' ? 'Welcome back.' : 'Join Slate.'}
          </h1>
          <p style={{ color: '#555', fontSize: '15px' }}>
            {mode === 'signin' ? 'Sign in to continue.' : 'Create your free guest account.'}
          </p>
          {searchParams.get('from') === 'rate' && (
            <p data-testid="rate-context" style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>
              {mode === 'signin' ? 'Sign in' : 'Create an account'} to post your rating. What you wrote is saved on this
              device and will be there when you come back.
            </p>
          )}
        </div>

        <button onClick={handleGoogle} style={{ width: '100%', padding: '14px', background: 'white', color: '#333', border: 'none', borderRadius: '4px', fontSize: '15px', cursor: 'pointer', marginBottom: '20px', fontWeight: '500' }}>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', color: '#333', marginBottom: '20px', fontSize: '13px' }}>or</div>

        {mode === 'signup' && (
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '14px', background: '#111', color: 'white', border: '1px solid #222', borderRadius: '4px', fontSize: '15px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' }} />
        )}

        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '14px', background: '#111', color: 'white', border: '1px solid #222', borderRadius: '4px', fontSize: '15px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' }} />

        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '14px', background: '#111', color: 'white', border: '1px solid #222', borderRadius: '4px', fontSize: '15px', marginBottom: '24px', outline: 'none', boxSizing: 'border-box' }} />

        {info && <p style={{ color: '#4ade80', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{info}</p>}
        {draftDeviceNote && (
          <p data-testid="draft-device-note" style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px', textAlign: 'center', lineHeight: 1.5 }}>
            Your rating hasn&apos;t been posted yet. It&apos;s saved only in this browser on this device, for about an hour.
            Open the confirmation link here to pick up where you left off. If you open it somewhere else, come back
            to this browser and sign in to post your rating.
          </p>
        )}

        {mode === 'signup' && (
          <div style={{ marginBottom: '20px' }}>
            <LegalConsent id="signup-legal" checked={legalAccepted} onChange={setLegalAccepted}>
              I&apos;m 18 or older, and I agree to Slate&apos;s
            </LegalConsent>
          </div>
        )}

        {error && <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
        {needsConfirm && (
          <button onClick={resendConfirmation}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', display: 'block', margin: '0 auto 16px' }}>
            Resend confirmation email
          </button>
        )}

        <button onClick={mode === 'signin' ? handleSignIn : handleSignUp} disabled={loading || (mode === 'signup' && !legalAccepted)}
          style={{ width: '100%', padding: '14px', background: 'white', color: 'black', border: 'none', borderRadius: '4px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '20px' }}>
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'signin' && (
          forgotSent ? (
            <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '12px', marginBottom: '20px' }}>
              Password reset email sent. Check your inbox.
            </p>
          ) : (
            <button
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: '#444',
                fontSize: '12px',
                letterSpacing: '1px',
                cursor: 'pointer',
                textDecoration: 'underline',
                display: 'block',
                margin: '12px auto 20px',
              }}
            >
              Forgot password?
            </button>
          )
        )}

        <p style={{ textAlign: 'center', color: '#555', fontSize: '14px' }}>
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}<span onClick={() => setMode('signup')} style={{ color: 'white', cursor: 'pointer', textDecoration: 'underline' }}>Sign up</span></>
          ) : (
            <>Already have an account?{' '}<span onClick={() => setMode('signin')} style={{ color: 'white', cursor: 'pointer', textDecoration: 'underline' }}>Sign in</span></>
          )}
        </p>

        {mode === 'signin' && (
          <p style={{ textAlign: 'center', color: '#444', fontSize: '13px', marginTop: '16px' }}>
            Are you a server?{' '}
            <a href="/servers/signup" style={{ color: 'white', textDecoration: 'underline' }}>Create a server profile →</a>
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
