// Address -> coordinates through the Maps JavaScript API Geocoder.
// The browser key can then be restricted to Slate's websites: Google rejects
// website-restricted keys on the Geocoding web service (geocode/json), but
// accepts them for the Maps JavaScript API.

const MAPS_SRC = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}&libraries=places`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapsGeocoder(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google?.maps?.Geocoder
}

let loading: Promise<void> | null = null

// Resolves once google.maps is available. Reuses a Maps script a page already
// added (live, dashboard) instead of loading it twice.
function loadMaps(timeoutMs = 8000): Promise<void> {
  if (mapsGeocoder()) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => {
    if (!document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const s = document.createElement('script')
      s.src = MAPS_SRC
      s.async = true
      s.onerror = () => reject(new Error('Google Maps failed to load'))
      document.head.appendChild(s)
    }
    const started = Date.now()
    const poll = setInterval(() => {
      if (mapsGeocoder()) {
        clearInterval(poll)
        resolve()
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(poll)
        reject(new Error('Google Maps did not load in time'))
      }
    }, 100)
  }).catch((err) => {
    loading = null
    throw err
  })
  return loading
}

// First result's coordinates, or null when Google finds nothing or fails.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    await loadMaps()
    const Geocoder = mapsGeocoder()
    const { results } = await new Geocoder().geocode({ address })
    const loc = results?.[0]?.geometry?.location
    return loc ? { lat: loc.lat(), lng: loc.lng() } : null
  } catch {
    return null
  }
}
