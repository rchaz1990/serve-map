'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'

type Server = {
  id: string
  name: string
  role: string | null
  average_rating: number | null
  total_ratings: number | null
  follower_count: number | null
  is_founding_member: boolean | null
  serve_balance_lifetime: number | null
  photo_url: string | null
  bio?: string | null
}

type ActiveShift = {
  restaurant_name: string
}

type Restaurant = {
  id: string
  restaurant_name: string
  city: string | null
  restaurant_address: string | null
  is_primary: boolean
  currently_working: boolean
}

type Rating = {
  id: string
  score: number
  comment: string | null
  guest_name: string | null
  restaurant_name: string | null
  created_at: string
}

export default function ServerProfilePage() {
  const params = useParams()
  const profileId = params.id as string

  const [server, setServer] = useState<Server | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'approved'>('none')
  const [followLoading, setFollowLoading] = useState(false)
  const [followerId, setFollowerId] = useState<string | null>(null)
  const [followerEmail, setFollowerEmail] = useState<string | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [currentShift, setCurrentShift] = useState<ActiveShift | null>(null)
  const profileCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadAll = async () => {
      // ── Profile data ──────────────────────────────────────────────────────
      console.log('[ServerProfile] Loading profile for ID:', profileId)
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()
      console.log('[ServerProfile] Server data:', data, 'Error:', error)

      if (data) {
        setServer(data as Server)
        setFollowerCount(data.follower_count ?? 0)

        const { data: rests } = await supabase
          .from('server_restaurants')
          .select('*')
          .eq('server_id', profileId)
          .order('is_primary', { ascending: false })
        setRestaurants((rests ?? []) as Restaurant[])

        const { data: rats } = await supabase
          .from('ratings')
          .select('*')
          .eq('server_id', profileId)
          .order('created_at', { ascending: false })
          .limit(10)
        setRatings((rats ?? []) as Rating[])

        // Active shift (for "On shift tonight" indicator) — only show
        // shifts started within the last 12 hours so stale rows that were
        // never explicitly ended don't display as active.
        const { data: activeShift } = await supabase
          .from('shifts')
          .select('restaurant_name, started_at')
          .eq('server_id', profileId)
          .eq('is_active', true)
          .gte('started_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (activeShift?.restaurant_name) {
          setCurrentShift({ restaurant_name: activeShift.restaurant_name })
        }
      }

      // ── Auth: own-profile check + follow state ────────────────────────────
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setFollowerId(session.user.id)
        setFollowerEmail(session.user.email ?? null)

        // Check if this is the logged-in server's own profile
        const { data: currentServer } = await supabase
          .from('servers')
          .select('id')
          .eq('wallet_address', session.user.id)
          .maybeSingle()
        setIsOwnProfile(currentServer?.id === profileId)

        // Check existing follow status
        const { data: followRow } = await supabase
          .from('follows')
          .select('id, status')
          .eq('follower_id', session.user.id)
          .eq('server_id', profileId)
          .maybeSingle()
        if (followRow) {
          setFollowStatus(followRow.status === 'approved' ? 'approved' : 'pending')
        }
      }

      setLoading(false)
    }

    loadAll()
  }, [profileId])

  async function handleFollow() {
    if (!followerId) { window.location.href = '/login'; return }
    setFollowLoading(true)
    if (followStatus === 'approved') {
      // Unfollow: delete row + atomically decrement
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('server_id', profileId)
      await supabase.rpc('decrement_follower_count', { server_uuid: profileId })
      setFollowStatus('none')
      setFollowerCount(prev => Math.max(0, prev - 1))
    } else if (followStatus === 'pending') {
      // Cancel pending request — no count change
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('server_id', profileId)
      setFollowStatus('none')
    } else {
      // New follow request — inserts as 'pending', no count increment until approved
      const { error: followError } = await supabase.from('follows').insert({
        follower_id: followerId,
        follower_email: followerEmail,
        server_id: profileId,
        follower_type: localStorage.getItem('slateUserType') ?? 'guest',
      })
      if (!followError) {
        setFollowStatus('pending')
      }
    }
    setFollowLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareOnX() {
    const serverName = server?.name || 'this server'
    const text = `Check out ${serverName} on Slate — NYC's first on-chain server reputation platform 🍸`
    const url = `https://slatenow.xyz/server/${profileId}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }

  async function shareToInstagram() {
    try {
      const html2canvas = (await import('html2canvas')).default
      if (!profileCardRef.current) return

      const canvas = await html2canvas(profileCardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const link = document.createElement('a')
      link.download = `${server?.name || 'slate'}-profile.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      alert('Profile card downloaded! Share it to your Instagram story 🍸')
    } catch (err) {
      console.error('Screenshot error:', err)
      // Fallback to Web Share API
      const url = `https://slatenow.xyz/server/${profileId}`
      if (navigator.share) {
        await navigator.share({ title: 'My Slate Profile', text: `Follow me on Slate 🍸`, url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied! Paste it in your Instagram story.')
      }
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p style={{ color: '#333', fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase' }}>Loading</p>
      </div>
    </div>
  )

  if (!server) return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '32px' }}>
        <p style={{ color: '#333', fontSize: '15px' }}>This profile doesn&apos;t exist yet.</p>
        <a href="/live" style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '4px', textDecoration: 'none', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          See what&apos;s live tonight
        </a>
      </div>
    </div>
  )

  // ── Derived values ────────────────────────────────────────────────────────

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
    : server.average_rating?.toFixed(1) ?? '—'
  const totalRatings = ratings.length || server.total_ratings || 0
  const serveBalance = server.serve_balance_lifetime ?? 0
  const primaryRestaurant = restaurants.find(r => r.is_primary) ?? restaurants[0] ?? null
  const firstName = server.name?.split(' ')[0] ?? 'them'

  // Editorial style tokens
  const FONT_DISPLAY = '"Playfair Display", Georgia, "Times New Roman", serif'
  const FONT_MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace'
  const FONT_BODY = '"EB Garamond", Georgia, "Times New Roman", serif'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: 'white', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      {/* Editorial fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slate-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
        @keyframes slate-pulse-ring {
          0%   { opacity: 0.6; transform: scale(0.9); }
          100% { opacity: 0;   transform: scale(2.4); }
        }
        .slate-share-link { color: #444; transition: color 0.15s, border-color 0.15s; border-bottom: 1px solid transparent; }
        .slate-share-link:hover { color: #FFFFFF; border-bottom-color: #FFFFFF; }
      `}} />

      <Navbar />
      {/* Thin white top border on the page */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.7)' }} />

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '72px 32px 120px' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section ref={profileCardRef} style={{ marginBottom: '48px' }}>

          {/* Photo */}
          <div style={{ marginBottom: '28px' }}>
            {server.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={server.photo_url}
                alt={server.name}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #222',
                }}
              />
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#0a0a0a',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT_DISPLAY,
                fontSize: '40px',
                fontWeight: 600,
                color: '#444',
              }}>
                {server.name?.[0]?.toUpperCase() ?? '·'}
              </div>
            )}
          </div>

          {server.is_founding_member && (
            <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '4px', color: '#444', marginBottom: '18px', textTransform: 'uppercase' }}>
              Founding Member
            </p>
          )}

          {/* Name */}
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: '36px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '14px',
            letterSpacing: '-0.01em',
          }}>
            {server.name}
          </h1>

          {/* Role */}
          {server.role && (
            <p style={{
              fontFamily: FONT_MONO,
              fontSize: '11px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#444',
              marginBottom: '24px',
            }}>
              {server.role}
            </p>
          )}

          {/* Currently working at */}
          {primaryRestaurant && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '6px' }}>
                Currently working at
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: '12px', color: '#555' }}>
                {primaryRestaurant.restaurant_name}
              </p>
            </div>
          )}
        </section>

        {/* ── Current shift (only when on shift) ─────────────────────────── */}
        {currentShift && (
          <section style={{
            marginBottom: '48px',
            padding: '20px 24px',
            border: '1px solid #0f0f0f',
            background: '#050505',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{ position: 'relative', width: '10px', height: '10px', flexShrink: 0 }}>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: '#4ade80',
                  animation: 'slate-pulse 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '1px solid #4ade80',
                  animation: 'slate-pulse-ring 2s ease-out infinite',
                }}
              />
            </div>
            <div>
              <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>
                On shift tonight
              </p>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#FFFFFF', lineHeight: 1.2 }}>
                {currentShift.restaurant_name}
              </p>
            </div>
          </section>
        )}

        {/* ── Stats row (4 stats, 1px #111 dividers between) ─────────────── */}
        <section style={{
          marginBottom: '40px',
          paddingTop: '32px',
          paddingBottom: '32px',
          borderTop: '1px solid #111',
          borderBottom: '1px solid #111',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { value: avgRating, label: 'Rating' },
            { value: totalRatings, label: 'Reviews' },
            { value: followerCount, label: 'Followers' },
            { value: serveBalance, label: '$SERVE' },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              style={{
                paddingLeft: i === 0 ? 0 : '20px',
                borderLeft: i === 0 ? 'none' : '1px solid #111',
              }}
            >
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '28px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1,
                marginBottom: '10px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: FONT_MONO,
                fontSize: '9px',
                letterSpacing: '3px',
                color: '#444',
                textTransform: 'uppercase',
              }}>
                {label}
              </div>
            </div>
          ))}
        </section>

        {/* ── Share links (minimal text, hover underline) ────────────────── */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '36px' }}>
          <button
            type="button"
            onClick={shareOnX}
            className="slate-share-link"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              fontFamily: FONT_MONO,
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Share on X
          </button>
          <button
            type="button"
            onClick={shareToInstagram}
            className="slate-share-link"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              fontFamily: FONT_MONO,
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Share on Instagram
          </button>
        </div>

        {/* ── Follow button (full width, hidden on own profile) ──────────── */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: followStatus === 'approved' ? 'transparent' : '#FFFFFF',
              color: followStatus === 'approved' ? '#555' : '#000000',
              border: followStatus === 'approved' ? '1px solid #1a1a1a' : '1px solid #FFFFFF',
              fontFamily: FONT_MONO,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              cursor: followLoading ? 'wait' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: followLoading ? 0.5 : 1,
              marginBottom: '56px',
            }}
          >
            {followStatus === 'approved'
              ? 'Following ✓'
              : followStatus === 'pending'
              ? 'Request sent'
              : `Follow ${firstName}`}
          </button>
        )}

        {/* ── Bio (only when present) ─────────────────────────────────────── */}
        {server.bio && server.bio.trim().length > 0 && (
          <section style={{ borderTop: '1px solid #111', borderBottom: '1px solid #111', paddingTop: '40px', paddingBottom: '40px', marginBottom: '48px' }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '20px' }}>
              About
            </p>
            <p style={{ fontFamily: FONT_BODY, fontSize: '16px', color: '#777', lineHeight: 1.8 }}>
              {server.bio}
            </p>
          </section>
        )}

        {/* ── Where you'll find me ────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '40px', marginBottom: '48px' }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '24px' }}>
            Where you&apos;ll find me
          </p>

          {restaurants.length === 0 ? (
            <p style={{ color: '#333', fontSize: '14px', fontFamily: FONT_MONO }}>No workplaces listed yet.</p>
          ) : restaurants.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingTop: i === 0 ? 0 : '18px',
                paddingBottom: '18px',
                borderBottom: '1px solid #0d0d0d',
              }}
            >
              <div>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: '17px', color: 'white', marginBottom: '4px' }}>
                  {r.restaurant_name}
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: '11px', letterSpacing: '1px', color: '#444' }}>
                  {r.city || r.restaurant_address}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: '4px' }}>
                {r.is_primary && (
                  <span style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '2px', color: '#444', border: '1px solid #1a1a1a', padding: '4px 10px', textTransform: 'uppercase' }}>
                    Primary
                  </span>
                )}
                {r.currently_working && (
                  <span style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '2px', color: '#888', border: '1px solid #222', padding: '4px 10px', textTransform: 'uppercase' }}>
                    Here now
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '40px', marginBottom: '48px' }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '24px' }}>
            Reviews
          </p>

          {ratings.length === 0 ? (
            <p style={{ color: '#333', fontSize: '14px', fontFamily: FONT_MONO, lineHeight: 1.7 }}>
              No reviews yet.
              {isOwnProfile && ' Share your profile link with guests to start collecting reviews.'}
            </p>
          ) : ratings.map((r, i) => (
            <div
              key={r.id}
              style={{
                paddingTop: i === 0 ? 0 : '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid #0d0d0d',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <span style={{ color: 'white', fontSize: '14px', letterSpacing: '2px' }}>
                    {'★'.repeat(r.score)}{'☆'.repeat(Math.max(0, 5 - r.score))}
                  </span>
                  {r.guest_name && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '1px', color: '#555' }}>
                      {r.guest_name}
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: FONT_MONO,
                  fontSize: '10px',
                  letterSpacing: '1px',
                  color: '#333',
                  flexShrink: 0,
                }}>
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.comment && (
                <p style={{
                  fontFamily: FONT_BODY,
                  fontSize: '15px',
                  fontStyle: 'italic',
                  color: '#666',
                  lineHeight: 1.75,
                  marginBottom: r.restaurant_name ? '8px' : 0,
                }}>
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
              {r.restaurant_name && (
                <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '1px', color: '#333' }}>
                  at {r.restaurant_name}
                </p>
              )}
            </div>
          ))}
        </section>

        {/* ── Share this profile (copy link) ─────────────────────────────── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '40px' }}>
          <p style={{ fontFamily: FONT_MONO, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '20px' }}>
            Share this profile
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a', paddingBottom: '14px', gap: '16px' }}>
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: '12px',
              color: '#444',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}>
              {typeof window !== 'undefined' ? window.location.href : `slatenow.xyz/server/${profileId}`}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#666' : '#FFFFFF',
                fontFamily: FONT_MONO,
                fontSize: '10px',
                letterSpacing: '3px',
                cursor: 'pointer',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
