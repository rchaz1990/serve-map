'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

export default function ScanPage() {
  const params = useParams()
  const router = useRouter()
  console.log('Scan page loaded with code:', params.code)

  const serverId = params.code as string
  const [server, setServer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'approved'>('none')
  const [followerCount, setFollowerCount] = useState(0)

  useEffect(() => {
    if (params.code) {
      loadServer()
    } else {
      setError('Invalid QR code')
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code])

  const loadServer = async () => {
    // Reset transient state so retries / re-mounts don't carry stale error/loading
    setLoading(true)
    setError('')
    setServer(null)

    console.log('Loading server for ID:', serverId)

    const { data: server, error } = await supabase
      .from('servers')
      .select('*, server_restaurants(*)')
      .eq('id', serverId)
      .maybeSingle()

    console.log('Server lookup result:', server, error)

    if (error) {
      console.error('Supabase error:', error)
      setError(`Database error: ${error.message}`)
      setLoading(false)
      return
    }

    if (!server) {
      console.error('No server found for ID:', serverId)
      setError('Server not found. Please scan the QR code again.')
      setLoading(false)
      return
    }

    setServer(server)
    setFollowerCount(server.follower_count || 0)

    // Check existing follow status
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id, status')
        .eq('follower_id', session.user.id)
        .eq('server_id', serverId)
        .maybeSingle()
      if (existingFollow) {
        setFollowStatus(existingFollow.status === 'approved' ? 'approved' : 'pending')
      }
    }

    setLoading(false)
  }

  const handleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?redirect=/scan/${serverId}`)
      return
    }

    // Fix 7: prevent self-follow
    if (session.user.id === serverId) return

    const { error: followError } = await supabase.from('follows').insert({
      follower_id: session.user.id,
      follower_email: session.user.email,
      server_id: serverId,
      follower_type: 'guest'
      // status defaults to 'pending' — follower_count only increments on approval
    })

    if (!followError) {
      setFollowStatus('pending')
    }
  }

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: '#666' }}>Loading...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '24px' }}>
        <p style={{ color: '#f87171', fontSize: '14px', textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          onClick={loadServer}
          style={{
            background: 'transparent', color: 'white',
            border: '1px solid #333', padding: '12px 28px',
            fontSize: '11px', letterSpacing: '2px',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )

  const currentRestaurant = server?.server_restaurants?.find(
    (r: any) => r.is_primary
  ) || server?.server_restaurants?.[0]

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '80px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: '#111', border: '1px solid #222',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            {server?.photo_url ?
              <img src={server.photo_url} style={{ width: '100%',
                height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt={server.name} />
              : '👤'}
          </div>

          <h1 style={{ fontFamily: 'Georgia', fontSize: '32px', marginBottom: '8px' }}>
            {server?.name}
          </h1>
          <p style={{ color: '#666', marginBottom: '4px' }}>{server?.role}</p>
          {currentRestaurant && (
            <p style={{ color: '#444', fontSize: '14px' }}>
              {currentRestaurant.restaurant_name}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '1px', background: '#111', marginBottom: '48px' }}>
          <div style={{ background: '#000', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontFamily: 'Georgia', fontWeight: '700' }}>
              {server?.average_rating?.toFixed(1) || '—'}
            </div>
            <div style={{ fontSize: '10px', color: '#444',
              letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              Rating
            </div>
          </div>
          <div style={{ background: '#000', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontFamily: 'Georgia', fontWeight: '700' }}>
              {server?.total_ratings || 0}
            </div>
            <div style={{ fontSize: '10px', color: '#444',
              letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              Reviews
            </div>
          </div>
          <div style={{ background: '#000', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontFamily: 'Georgia', fontWeight: '700' }}>
              {followerCount}
            </div>
            <div style={{ fontSize: '10px', color: '#444',
              letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              Followers
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => router.push(`/rate?server=${serverId}`)}
            style={{
              width: '100%', background: 'white', color: 'black',
              border: 'none', padding: '16px',
              fontSize: '14px', letterSpacing: '2px',
              textTransform: 'uppercase', cursor: 'pointer'
            }}
          >
            Rate {server?.name?.split(' ')[0]}
          </button>

          <button
            onClick={handleFollow}
            disabled={followStatus !== 'none'}
            style={{
              width: '100%', background: 'transparent', color: 'white',
              border: '1px solid #333', padding: '16px',
              fontSize: '14px', letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: followStatus !== 'none' ? 'default' : 'pointer',
              opacity: followStatus !== 'none' ? 0.5 : 1
            }}
          >
            {followStatus === 'approved'
              ? 'Following'
              : followStatus === 'pending'
              ? 'Request sent'
              : `Follow ${server?.name?.split(' ')[0]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
