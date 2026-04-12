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
  serve_balance: number | null
  is_founding_member: boolean | null
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
  const [server, setServer] = useState<Server | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const profileId = params.id as string

  useEffect(() => {
    const loadProfile = async () => {
      console.log('[ServerProfile] Loading profile for ID:', profileId)

      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()

      console.log('[ServerProfile] Server data:', data, 'Error:', error)

      if (data) {
        setServer(data as Server)

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

      setLoading(false)
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setGuestId(session.user.id)
      const { data } = await supabase
        .from('follows')
        .select('server_id')
        .eq('guest_id', session.user.id)
        .eq('server_id', profileId)
        .maybeSingle()
      if (data) setFollowing(true)
    }

    loadProfile()
    checkAuth()
  }, [profileId])

  async function handleFollow() {
    if (!guestId) {
      window.location.href = '/login'
      return
    }
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('guest_id', guestId).eq('server_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ guest_id: guestId, server_id: profileId })
      setFollowing(true)
    }
    setFollowLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Navbar />
      <p style={{ color: '#444', fontSize: '14px', letterSpacing: '2px' }}>Loading...</p>
    </div>
  )

  if (!server) return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '24px' }}>
        <p style={{ color: '#444', fontSize: '16px' }}>Profile not found.</p>
        <a href="/live" style={{ color: 'white', border: '1px solid #333', padding: '12px 24px', textDecoration: 'none', fontSize: '14px' }}>
          See what&apos;s live tonight
        </a>
      </div>
    </div>
  )

  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : server.average_rating?.toFixed(1) ?? '—'

  const totalRatings = ratings.length || server.total_ratings || 0

  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Navbar />
      <div style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '48px' }}>
            {server.is_founding_member && (
              <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#555', marginBottom: '16px', textTransform: 'uppercase' }}>
                Founding Member
              </div>
            )}
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '48px', color: 'white', marginBottom: '8px', fontWeight: '400' }}>
              {server.name}
            </h1>
            <p style={{ color: '#555', fontSize: '16px', marginBottom: '24px' }}>{server.role}</p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '32px' }}>
              <div>
                <div style={{ fontSize: '24px', color: 'white', fontWeight: '600' }}>{avgRating}</div>
                <div style={{ fontSize: '11px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Rating</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: 'white', fontWeight: '600' }}>{totalRatings}</div>
                <div style={{ fontSize: '11px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Reviews</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: 'white', fontWeight: '600' }}>{server.follower_count || 0}</div>
                <div style={{ fontSize: '11px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Followers</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: 'white', fontWeight: '600' }}>{totalRatings * 10}</div>
                <div style={{ fontSize: '11px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>$SERVE</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  padding: '12px 28px',
                  background: following ? 'transparent' : 'white',
                  color: following ? '#666' : 'black',
                  border: following ? '1px solid #333' : 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {following ? 'Following ✓' : 'Follow'}
              </button>
              <button
                onClick={handleCopy}
                style={{
                  padding: '12px 28px',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #222',
                  fontSize: '14px',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {copied ? 'Copied!' : 'Copy profile link'}
              </button>
            </div>
          </div>

          {/* ── Restaurants ── */}
          <div style={{ borderTop: '1px solid #111', paddingTop: '40px', marginBottom: '40px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', marginBottom: '24px', textTransform: 'uppercase' }}>
              Where you&apos;ll find me
            </div>
            {restaurants.length === 0 ? (
              <p style={{ color: '#333', fontSize: '15px' }}>No workplaces listed yet.</p>
            ) : (
              restaurants.map(r => (
                <div key={r.id} style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '16px' }}>{r.restaurant_name}</div>
                    <div style={{ color: '#444', fontSize: '13px', marginTop: '4px' }}>{r.city || r.restaurant_address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {r.is_primary && (
                      <span style={{ fontSize: '10px', letterSpacing: '2px', color: '#555', border: '1px solid #222', padding: '4px 10px', textTransform: 'uppercase' }}>
                        Primary
                      </span>
                    )}
                    {r.currently_working && (
                      <span style={{ fontSize: '10px', letterSpacing: '2px', color: '#666', border: '1px solid #222', padding: '4px 10px', textTransform: 'uppercase' }}>
                        Currently here
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Ratings ── */}
          <div style={{ borderTop: '1px solid #111', paddingTop: '40px', marginBottom: '40px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', marginBottom: '24px', textTransform: 'uppercase' }}>
              What guests are saying
            </div>
            {ratings.length === 0 ? (
              <p style={{ color: '#333', fontSize: '15px' }}>No ratings yet.</p>
            ) : (
              ratings.map(r => (
                <div key={r.id} style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #111' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                        {r.guest_name ?? 'Guest'}
                      </span>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                      </span>
                    </div>
                    <span style={{ color: '#333', fontSize: '12px' }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && (
                    <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  {r.restaurant_name && (
                    <p style={{ color: '#333', fontSize: '12px', letterSpacing: '1px' }}>at {r.restaurant_name}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Share ── */}
          <div style={{ borderTop: '1px solid #111', paddingTop: '40px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#444', marginBottom: '16px', textTransform: 'uppercase' }}>
              Share this profile
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '14px 16px' }}>
              <span style={{ flex: 1, color: '#444', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {typeof window !== 'undefined' ? window.location.href : `slatenow.xyz/server/${profileId}`}
              </span>
              <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: 'white', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
