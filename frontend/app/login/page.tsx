'use client'
import { useState, Suspense } from 'react'
import { authJsonHeaders } from '@/lib/auth-fetch'
import { supabase } from '@/lib/supabase'
import { getAuthCallbackUrl, getAppOrigin, safeInternalPath, setOAuthNextHint } from '@/lib/auth-redirect'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); return }
      if (!data.user?.id) { setError('Sign in did not return a user.'); return }

      // Managers first (same order as /auth/callback + Navbar)
      const { data: managerRow } = await supabase
        .from('restaurant_managers')
        .select('id, restaurant_name')
        .eq('auth_id', data.user.id)
        .maybeSingle()
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
    setLoading(true)
    setError('')
    const { data: signUpData, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) { setError(error.message); setLoading(false); return }
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
    router.push('/live')
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppOrigin()}/login`,
    })
    if (!error) {
      setForgotSent(true)
    }
  }

  const handleGoogle = async () => {
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

        {error && <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

        <button onClick={mode === 'signin' ? handleSignIn : handleSignUp} disabled={loading}
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
