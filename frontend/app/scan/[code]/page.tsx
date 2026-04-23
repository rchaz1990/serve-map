'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

export default function ScanPage() {
  const params = useParams()
  const router = useRouter()
  const serverId = params.code as string
  const [server, setServer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    if (!serverId) {
      setError('Invalid QR code')
      setLoading(false)
      return
    }
    loadServer()
  }, [serverId])

  const loadServer = async () => {
    console.log('Loading server for ID:', serverId)

    const { data, error } = await supabase
      .from('servers')
      .select('*, server_restaurants(*)')
      .eq('id', serverId)
      .maybeSingle()

    console.log('Server data:', data, 'Error:', error)

    if (data) {
      setServer(data)
    } else {
      setError('Server not found. Please scan the QR code again.')
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?redirect=/scan/${serverId}`)
      return
    }

    await supabase.from('follows').insert({
      follower_id: session.user.id,
      follower_email: session.user.email,
      server_id: serverId,
      follower_type: 'guest'
    })

    await supabase
      .from('servers')
      .update({ follower_count: (server?.follower_count || 0) + 1 })
      .eq('id', serverId)

    setIsFollowing(true)
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
        justifyContent: 'center', height: '80vh', flexDirection: 'column' }}>
        <p style={{ color: 'red' }}>{error}</p>
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
              {server?.follower_count || 0}
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
            disabled={isFollowing}
            style={{
              width: '100%', background: 'transparent', color: 'white',
              border: '1px solid #333', padding: '16px',
              fontSize: '14px', letterSpacing: '2px',
              textTransform: 'uppercase', cursor: isFollowing ? 'default' : 'pointer',
              opacity: isFollowing ? 0.5 : 1
            }}
          >
            {isFollowing ? 'Following ✓' : `Follow ${server?.name?.split(' ')[0]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
