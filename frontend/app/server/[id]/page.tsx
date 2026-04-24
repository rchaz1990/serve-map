'use client'

import { useEffect, useState } from 'react'
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
  serve_balance: number | null
  photo_url: string | null
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
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerId, setFollowerId] = useState<string | null>(null)
  const [followerEmail, setFollowerEmail] = useState<string | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [copied, setCopied] = useState(false)

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

        // Check existing follow (any logged-in user)
        const { data: followRow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('server_id', profileId)
          .maybeSingle()
        if (followRow) setFollowing(true)
      }

      setLoading(false)
    }

    loadAll()
  }, [profileId])

  async function handleFollow() {
    if (!followerId) { window.location.href = '/login'; return }
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('server_id', profileId)
      const { data: serverData } = await supabase
        .from('servers').select('follower_count').eq('id', profileId).maybeSingle()
      await supabase
        .from('servers')
        .update({ follower_count: Math.max(0, (serverData?.follower_count || 1) - 1) })
        .eq('id', profileId)
      setFollowing(false)
      setFollowerCount(prev => Math.max(0, prev - 1))
    } else {
      const { error: followError } = await supabase.from('follows').insert({
        follower_id: followerId,
        follower_email: followerEmail,
        server_id: profileId,
        follower_type: localStorage.getItem('slateUserType') ?? 'guest',
      })
      if (!followError) {
        const { data: serverData } = await supabase
          .from('servers').select('follower_count').eq('id', profileId).maybeSingle()
        await supabase
          .from('servers')
          .update({ follower_count: (serverData?.follower_count || 0) + 1 })
          .eq('id', profileId)
        setFollowing(true)
        setFollowerCount(prev => prev + 1)
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

  async function shareOnInstagram() {
    try {
      const url = `https://slatenow.xyz/server/${profileId}`
      if (navigator.share) {
        await navigator.share({
          title: `${server?.name || 'Server'} on Slate`,
          text: `Check out ${server?.name || 'this server'} on Slate 🍸`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Profile link copied! Paste it in your Instagram story or bio.')
      }
    } catch (err) {
      console.error('Share failed:', err)
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
  const serveBalance = server.serve_balance ?? 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: 'white', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <Navbar />

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 32px 120px' }}>

        {/* ── Header ── */}
        <section style={{ marginBottom: '64px' }}>

          {/* Profile photo */}
          <div style={{ marginBottom: '24px' }}>
            {server.photo_url ? (
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
                background: '#111',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
              }}>👤</div>
            )}
          </div>

          {server.is_founding_member && (
            <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', marginBottom: '20px', textTransform: 'uppercase' }}>
              Founding Member
            </p>
          )}

          <h1 style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(40px, 8vw, 64px)',
            fontWeight: '400',
            color: 'white',
            lineHeight: '1.1',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}>
            {server.name}
          </h1>

          <p style={{ fontSize: '16px', color: '#555', marginBottom: '24px', letterSpacing: '0.2px' }}>
            {server.role}
          </p>

          {/* ── Share links ── */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm on Slate — the first on-chain reputation platform for NYC servers and bartenders 🍸 slatenow.xyz/server/${profileId}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'transparent', color: 'white', border: '1px solid #333',
                padding: '12px 24px', fontSize: '11px', letterSpacing: '2px',
                textTransform: 'uppercase', textDecoration: 'none',
                minHeight: '44px', lineHeight: '20px',
              }}
            >
              Share on X
            </a>
            <button
              onClick={async () => {
                const url = `https://slatenow.xyz/server/${profileId}`
                const text = `Follow me on Slate 🍸`
                if (navigator.share) {
                  await navigator.share({ title: 'My Slate Profile', text, url })
                } else {
                  await navigator.clipboard.writeText(url)
                  alert('Link copied! Paste it in your Instagram story.')
                }
              }}
              style={{
                background: 'transparent', color: 'white', border: '1px solid #333',
                padding: '12px 24px', fontSize: '11px', letterSpacing: '2px',
                textTransform: 'uppercase', cursor: 'pointer',
                minHeight: '44px', touchAction: 'manipulation',
              }}
            >
              Share on Instagram
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', marginBottom: '40px', borderTop: '1px solid #111', paddingTop: '32px' }}>
            {[
              { value: avgRating, label: 'Rating' },
              { value: totalRatings, label: 'Reviews' },
              { value: followerCount, label: 'Followers' },
              { value: serveBalance, label: '$SERVE' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div style={{ fontSize: '28px', fontWeight: '600', color: 'white', lineHeight: '1', marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </div>
                <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#444', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons — hidden on own profile */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  padding: '11px 28px',
                  background: following ? 'transparent' : 'white',
                  color: following ? '#555' : '#000',
                  border: following ? '1px solid #2a2a2a' : '1px solid white',
                  fontSize: '13px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  opacity: followLoading ? 0.5 : 1,
                }}
              >
                {following ? 'Following ✓' : 'Follow'}
              </button>
            )}
            <button
              onClick={handleCopy}
              style={{
                padding: '11px 28px',
                background: 'transparent',
                color: '#555',
                border: '1px solid #1e1e1e',
                fontSize: '13px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied' : 'Share profile'}
            </button>
          </div>
        </section>

        {/* ── Where you'll find me ── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '48px', marginBottom: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', textTransform: 'uppercase', marginBottom: '32px' }}>
            Where you&apos;ll find me
          </p>

          {restaurants.length === 0 ? (
            <p style={{ color: '#2a2a2a', fontSize: '15px' }}>No workplaces listed yet.</p>
          ) : restaurants.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingTop: i === 0 ? 0 : '20px',
                paddingBottom: '20px',
                borderBottom: '1px solid #0f0f0f',
              }}
            >
              <div>
                <p style={{ color: 'white', fontSize: '16px', marginBottom: '4px' }}>{r.restaurant_name}</p>
                <p style={{ color: '#444', fontSize: '13px' }}>{r.city || r.restaurant_address}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
                {r.is_primary && (
                  <span style={{ fontSize: '9px', letterSpacing: '2px', color: '#444', border: '1px solid #1e1e1e', padding: '4px 10px', textTransform: 'uppercase' }}>
                    Primary
                  </span>
                )}
                {r.currently_working && (
                  <span style={{ fontSize: '9px', letterSpacing: '2px', color: '#777', border: '1px solid #222', padding: '4px 10px', textTransform: 'uppercase' }}>
                    Here now
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ── Guest ratings ── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '48px', marginBottom: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', textTransform: 'uppercase', marginBottom: '32px' }}>
            What guests are saying
          </p>

          {ratings.length === 0 ? (
            <p style={{ color: '#2a2a2a', fontSize: '15px', lineHeight: '1.7' }}>
              No ratings yet.{' '}
              {isOwnProfile && 'Share your profile link with guests to start collecting reviews.'}
            </p>
          ) : ratings.map((r, i) => (
            <div
              key={r.id}
              style={{
                paddingTop: i === 0 ? 0 : '32px',
                paddingBottom: '32px',
                borderBottom: '1px solid #0f0f0f',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                    {r.guest_name ?? 'Guest'}
                  </span>
                  <span style={{ color: '#444', fontSize: '13px', letterSpacing: '2px' }}>
                    {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                  </span>
                </div>
                <span style={{ color: '#333', fontSize: '12px', flexShrink: 0, marginLeft: '16px' }}>
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {r.comment && (
                <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.75', marginBottom: '8px', fontStyle: 'italic' }}>
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
              {r.restaurant_name && (
                <p style={{ color: '#333', fontSize: '12px', letterSpacing: '1px' }}>at {r.restaurant_name}</p>
              )}
            </div>
          ))}
        </section>

        {/* ── Share — copy link ── */}
        <section style={{ borderTop: '1px solid #111', paddingTop: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', textTransform: 'uppercase', marginBottom: '20px' }}>
            Share this profile
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
            <span style={{ color: '#333', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '16px' }}>
              {typeof window !== 'undefined' ? window.location.href : `slatenow.xyz/server/${profileId}`}
            </span>
            <button
              onClick={handleCopy}
              style={{ background: 'none', border: 'none', color: copied ? '#666' : 'white', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer', flexShrink: 0, textTransform: 'uppercase' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
