import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

// ── Data ─────────────────────────────────────────────────────────────────────

const RESTAURANTS: Record<string, {
  name: string
  cuisine: string
  neighborhood: string
  address: string
  hours: string
  staffRating: number
  reviews: number
  staff: { initials: string; firstName: string; rating: number; specialty: string }[]
  guestReviews: { rating: number; comment: string; date: string; guest: string }[]
}> = {
  '1': {
    name: 'Carbone',
    cuisine: 'Italian',
    neighborhood: 'West Village, NYC',
    address: '181 Thompson St, New York, NY 10012',
    hours: 'Mon–Sat 5:30 PM – 11:00 PM · Sun 5:00 PM – 10:00 PM',
    staffRating: 4.9,
    reviews: 89,
    staff: [
      { initials: 'MJ', firstName: 'Marcus',  rating: 4.9, specialty: 'Craft Cocktails' },
      { initials: 'SR', firstName: 'Sofia',   rating: 4.8, specialty: 'Wine Pairings'   },
      { initials: 'JC', firstName: 'James',   rating: 4.7, specialty: 'Fine Dining'     },
    ],
    guestReviews: [
      { rating: 5, guest: 'Sarah K.', date: 'March 12, 2026', comment: 'Every detail was perfect. Our server remembered it was our anniversary without us saying a word.' },
      { rating: 5, guest: 'David L.', date: 'March 3, 2026',  comment: 'The rigatoni vodka is legendary, but the staff keep us coming back every month.' },
      { rating: 5, guest: 'Rachel M.', date: 'Feb 22, 2026',  comment: 'Impeccable service. Never felt rushed, never felt ignored. The gold standard.' },
    ],
  },
  '2': {
    name: 'Employees Only',
    cuisine: 'Cocktail Bar',
    neighborhood: 'West Village, NYC',
    address: '510 Hudson St, New York, NY 10014',
    hours: 'Daily 6:00 PM – 3:30 AM',
    staffRating: 4.8,
    reviews: 134,
    staff: [
      { initials: 'AM', firstName: 'Alex',    rating: 4.9, specialty: 'Classic Cocktails' },
      { initials: 'RB', firstName: 'Rachel',  rating: 4.8, specialty: 'Mixology'          },
      { initials: 'TW', firstName: 'Thomas',  rating: 4.7, specialty: 'Spirits'           },
    ],
    guestReviews: [
      { rating: 5, guest: 'Mike T.',    date: 'March 18, 2026', comment: 'Best cocktail bar in the city, full stop. The bartenders know their craft.' },
      { rating: 5, guest: 'Priya N.',   date: 'March 10, 2026', comment: 'We stay until close every time. The atmosphere and staff are unmatched.' },
      { rating: 4, guest: 'Jordan K.',  date: 'Feb 28, 2026',   comment: 'Incredible drinks and genuinely warm service. A little loud but worth it.' },
    ],
  },
  '3': {
    name: 'Le Bernardin',
    cuisine: 'French Fine Dining',
    neighborhood: 'Midtown, NYC',
    address: '155 W 51st St, New York, NY 10019',
    hours: 'Mon–Fri 12:00 PM – 2:30 PM, 5:30 PM – 10:30 PM · Sat 5:30 PM – 10:30 PM',
    staffRating: 4.9,
    reviews: 201,
    staff: [
      { initials: 'SR', firstName: 'Sofia',   rating: 4.9, specialty: 'Seafood & Wine'  },
      { initials: 'PL', firstName: 'Pierre',  rating: 4.9, specialty: 'French Service'  },
      { initials: 'LM', firstName: 'Laure',   rating: 4.8, specialty: 'Sommelier'       },
    ],
    guestReviews: [
      { rating: 5, guest: 'Charles W.', date: 'March 20, 2026', comment: 'Three Michelin stars and you feel every one of them from the moment you walk in.' },
      { rating: 5, guest: 'Anna S.',    date: 'March 5, 2026',  comment: 'Our server guided us through the tasting menu flawlessly. Truly a once-in-a-lifetime meal.' },
      { rating: 5, guest: 'Ben H.',     date: 'Feb 14, 2026',   comment: 'The most attentive service experienced anywhere in the world.' },
    ],
  },
  '4': {
    name: 'Nobu',
    cuisine: 'Japanese',
    neighborhood: 'Tribeca, NYC',
    address: '105 Hudson St, New York, NY 10013',
    hours: 'Mon–Fri 11:45 AM – 2:15 PM, 5:45 PM – 10:15 PM · Sat–Sun 5:45 PM – 10:15 PM',
    staffRating: 4.7,
    reviews: 156,
    staff: [
      { initials: 'KT', firstName: 'Kenji',   rating: 4.8, specialty: 'Omakase'         },
      { initials: 'YM', firstName: 'Yuki',    rating: 4.7, specialty: 'Sake Pairing'    },
      { initials: 'HL', firstName: 'Hana',    rating: 4.7, specialty: 'Japanese Cuisine' },
    ],
    guestReviews: [
      { rating: 5, guest: 'Jessica R.', date: 'March 15, 2026', comment: 'The black cod is as iconic as the service. Kenji walked us through every dish.' },
      { rating: 5, guest: 'Tom B.',     date: 'March 1, 2026',  comment: 'Impeccable. Been dining here for years and the staff never disappoints.' },
      { rating: 4, guest: 'Claire D.',  date: 'Feb 20, 2026',   comment: 'Worth every penny. Busy but the staff make you feel like the only table in the room.' },
    ],
  },
  '5': {
    name: 'Gramercy Tavern',
    cuisine: 'American',
    neighborhood: 'Gramercy, NYC',
    address: '42 E 20th St, New York, NY 10003',
    hours: 'Mon–Thu 12:00 PM – 10:00 PM · Fri–Sat 12:00 PM – 11:00 PM · Sun 11:30 AM – 9:00 PM',
    staffRating: 4.9,
    reviews: 178,
    staff: [
      { initials: 'GH', firstName: 'Grace',   rating: 4.9, specialty: 'American Cuisine' },
      { initials: 'DM', firstName: 'Daniel',  rating: 4.9, specialty: 'Craft Beer'       },
      { initials: 'EW', firstName: 'Emma',    rating: 4.8, specialty: 'Farm-to-Table'    },
    ],
    guestReviews: [
      { rating: 5, guest: 'Laura P.',  date: 'March 22, 2026', comment: 'Gramercy Tavern is what a neighborhood restaurant would be if it had a Michelin star. Warm, genuine, perfect.' },
      { rating: 5, guest: 'Steven K.', date: 'March 8, 2026',  comment: 'The tavern room is one of my favorite places to eat in New York. Staff make it feel like home.' },
      { rating: 5, guest: 'Nina F.',   date: 'Feb 28, 2026',   comment: 'Went for brunch and stayed three hours. Zero pressure, incredible food, and our server Emma was a delight.' },
    ],
  },
  '6': {
    name: 'The NoMad Bar',
    cuisine: 'Cocktail Bar',
    neighborhood: 'NoMad, NYC',
    address: '1170 Broadway, New York, NY 10001',
    hours: 'Mon–Thu 5:00 PM – 12:00 AM · Fri–Sat 4:00 PM – 1:00 AM · Sun 4:00 PM – 11:00 PM',
    staffRating: 4.8,
    reviews: 92,
    staff: [
      { initials: 'CB', firstName: 'Chris',   rating: 4.9, specialty: 'Whiskey & Spirits' },
      { initials: 'ML', firstName: 'Maya',    rating: 4.8, specialty: 'Classic Cocktails'  },
      { initials: 'OT', firstName: 'Oliver',  rating: 4.7, specialty: 'Seasonal Menus'    },
    ],
    guestReviews: [
      { rating: 5, guest: 'Amir J.',   date: 'March 19, 2026', comment: 'The most thoughtfully curated drinks program in the city. Chris built us a custom tasting flight.' },
      { rating: 5, guest: 'Claire S.', date: 'March 7, 2026',  comment: 'Elegant without being stiff. The bartenders here feel like friends by the end of the night.' },
      { rating: 4, guest: 'Owen R.',   date: 'Feb 25, 2026',   comment: 'Consistently excellent. The cocktail menu changes seasonally and is always worth the visit.' },
    ],
  },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const restaurant = RESTAURANTS[id]

  if (!restaurant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <p className="text-sm font-medium">Restaurant not found</p>
        <a href="/explore" className="mt-4 text-xs underline" style={{ color: '#A0A0A0' }}>
          Back to explore
        </a>
      </div>
    )
  }

  const { name, cuisine, neighborhood, address, hours, staffRating, reviews, staff, guestReviews } = restaurant

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-96">
        <Image
          src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1920&q=80"
          alt={name}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        {/* Breadcrumb */}
        <div className="absolute bottom-6 left-8 lg:left-16">
          <a href="/explore" className="text-xs transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
            ← Explore
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-8 pb-24 pt-10 lg:px-16">

        {/* ── Restaurant header ────────────────────────────────────────── */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
            <p className="mt-1.5 text-sm" style={{ color: '#A0A0A0' }}>
              {cuisine} · {neighborhood}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              {/* Staff rating */}
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-white">{staffRating.toFixed(1)}</span>
                <span className="text-xs" style={{ color: '#606060' }}>Staff Rating</span>
              </div>
              {/* Divider dot */}
              <div className="h-1 w-1 rounded-full bg-white/20" />
              {/* Reviews */}
              <span className="text-xs" style={{ color: '#A0A0A0' }}>
                {reviews} verified reviews
              </span>
            </div>
          </div>

          <a
            href="/book"
            className="self-start rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:self-auto sm:shrink-0"
          >
            Reserve a table
          </a>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Slate Verified Staff ─────────────────────────────────────── */}
        <section className="py-12">
          <div className="mb-2 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
              <circle cx="12" cy="12" r="12" fill="white" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-base font-semibold text-white">Slate Verified Staff</h2>
          </div>
          <p className="mb-8 text-sm" style={{ color: '#A0A0A0' }}>
            Dine with us to meet our team and start following your favorites.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {staff.map(({ initials, firstName, rating, specialty }) => (
              <div
                key={initials}
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 p-6 text-center"
                style={{ backgroundColor: '#0a0a0a' }}
              >
                {/* Avatar */}
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white text-base font-bold text-black">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{firstName}</p>
                  <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>{specialty}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-white">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-semibold text-white">{rating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Guest Reviews ────────────────────────────────────────────── */}
        <section className="py-12">
          <h2 className="mb-8 text-base font-semibold text-white">Guest Reviews</h2>

          <div className="flex flex-col gap-0">
            {guestReviews.map(({ rating, comment, date, guest }, i) => (
              <div key={i}>
                <div className="py-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                        {guest.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{guest}</p>
                        <span className="text-xs tracking-wide text-white">
                          {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: '#606060' }}>{date}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                    &ldquo;{comment}&rdquo;
                  </p>
                </div>
                {i < guestReviews.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── About ────────────────────────────────────────────────────── */}
        <section className="py-12">
          <h2 className="mb-8 text-base font-semibold text-white">About</h2>

          <div className="mb-10 flex flex-col gap-5">
            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#A0A0A0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#606060' }}>Address</p>
                <p className="text-sm text-white">{address}</p>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#A0A0A0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#606060' }}>Hours</p>
                <p className="text-sm text-white">{hours}</p>
              </div>
            </div>

            {/* Cuisine */}
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#A0A0A0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 20.488l-.023.14a1.5 1.5 0 0 1-2.954 0 17.68 17.68 0 0 1-.267-1.596c-.18-1.784-1.065-3.197-2.756-3.197H6.75A2.25 2.25 0 0 1 4.5 15.75v-3a2.25 2.25 0 0 1 2.25-2.25h10.5A2.25 2.25 0 0 1 19.5 12.75v3a2.25 2.25 0 0 1-2.25 2.25h-.994c-1.69 0-2.576 1.413-2.756 3.197Z" />
                </svg>
              </div>
              <div>
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#606060' }}>Cuisine</p>
                <p className="text-sm text-white">{cuisine}</p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <a
            href="/book"
            className="inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Reserve a table
          </a>
        </section>

      </main>
    </div>
  )
}
