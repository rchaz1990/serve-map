import Navbar from '@/app/components/Navbar'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      {
        subtitle: 'Account information',
        text: 'When you create a Slate account we collect your name and email address. Servers and bartenders also provide the venues they work at and may add a photo, bio, specialties, phone number, and Instagram handle. This information is used to create and identify your profile.',
      },
      {
        subtitle: 'Location data',
        text: 'When you report a venue\'s vibe, or start a shift as a server or bartender, Slate may ask for your device location to check that you are at the venue. If you share it, we store the coordinates with that report or shift. Coordinates are never shown publicly. Ratings do not currently use your location.',
      },
      {
        subtitle: 'Ratings and reviews',
        text: 'When you rate a server or bartender, your score, any written comment, and any tags you choose are stored by Slate and shown on that person\'s public profile. Your name and email address are not shown with your rating.',
      },
      {
        subtitle: 'Usage data',
        text: 'We record pages visited and QR code scans (with an anonymous browser identifier) to understand how Slate is used and to improve it.',
      },
    ],
  },
  {
    title: 'How We Use Your Information',
    body: [
      {
        subtitle: 'To keep ratings genuine',
        text: 'We use account and usage information to detect fake or coordinated ratings and to protect the integrity of every server\'s reputation.',
      },
      {
        subtitle: 'To send notifications',
        text: 'If you follow a server on Slate, we email you when that server starts a shift. To stop these emails, unfollow the server or contact us.',
      },
      {
        subtitle: 'To calculate Slate Points',
        text: 'For servers and bartenders, we use your rating history to calculate Slate Points and your reputation score.',
      },
      {
        subtitle: 'To operate the platform',
        text: 'We use account information to authenticate users, resolve disputes, and respond to support requests.',
      },
    ],
  },
  {
    title: 'Public Profiles and Blockchain',
    body: [
      {
        subtitle: 'What is public',
        text: 'Server and bartender profiles are public: name, photo, role, bio, specialties, workplaces, ratings and comments, follower count, Slate Points, and the venue where you are working while you are on shift. Email addresses, phone numbers, and location coordinates are not public.',
      },
      {
        subtitle: 'Blockchain',
        text: 'Slate does not currently store any data on a blockchain. If we introduce blockchain features, we will explain what would be written on-chain before anything is.',
      },
    ],
  },
  {
    title: 'Data Sharing',
    body: [
      {
        subtitle: 'We do not sell your data',
        text: 'Slate does not sell, rent, or trade your personal information to third parties for marketing purposes.',
      },
      {
        subtitle: 'Service providers',
        text: 'We work with a small number of service providers — hosting and database, email delivery, maps, and our newsletter — who access data only as necessary to provide their services.',
      },
      {
        subtitle: 'Legal requirements',
        text: 'We may disclose information if required by law or to protect the rights, property, or safety of Slate, our users, or the public.',
      },
    ],
  },
  {
    title: 'Your Rights',
    body: [
      {
        subtitle: 'Access and correction',
        text: 'You can update your profile details from your dashboard. For anything else, contact us at team@slatenow.xyz.',
      },
      {
        subtitle: 'Account deletion',
        text: 'You can request deletion of your Slate account and associated personal data by emailing team@slatenow.xyz.',
      },
      {
        subtitle: 'Email notifications',
        text: 'Shift emails stop when you unfollow a server. To stop all Slate emails, contact us.',
      },
    ],
  },
  {
    title: 'Data Security',
    body: [
      {
        subtitle: '',
        text: 'We use industry-standard security practices to protect your personal information including encrypted connections (HTTPS), secure authentication, and access controls. No method of transmission over the internet is 100% secure. If you believe your account has been compromised contact us immediately at team@slatenow.xyz.',
      },
    ],
  },
  {
    title: 'Children',
    body: [
      {
        subtitle: '',
        text: 'Slate is intended for users 18 years of age and older. We do not knowingly collect personal information from anyone under 18. If we become aware that a user is under 18 we will terminate their account.',
      },
    ],
  },
  {
    title: 'Changes to This Policy',
    body: [
      {
        subtitle: '',
        text: 'We may update this Privacy Policy from time to time. When we do we will update the effective date below and, for material changes, notify users by email. Continued use of Slate after changes are posted constitutes acceptance of the updated policy.',
      },
    ],
  },
  {
    title: 'Contact',
    body: [
      {
        subtitle: '',
        text: 'Questions about this Privacy Policy? Contact us at team@slatenow.xyz.',
      },
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-2xl px-6 py-16 lg:py-24">

        <div className="mb-14">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Legal
          </p>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: '#606060' }}>Updated October 2026</p>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((section, i) => (
            <section key={section.title}>
              <div className="mb-5 flex items-baseline gap-3">
                <span className="font-mono text-xs" style={{ color: '#404040' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="text-lg font-bold text-white">{section.title}</h2>
              </div>
              <div className="space-y-4 border-l border-white/10 pl-6">
                {section.body.map((block, j) => (
                  <div key={j}>
                    {block.subtitle && (
                      <p className="mb-1 text-sm font-semibold text-white">{block.subtitle}</p>
                    )}
                    <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>{block.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <p className="text-xs" style={{ color: '#404040' }}>
            © 2026 Slate · <a href="mailto:team@slatenow.xyz" className="hover:text-white transition-colors">team@slatenow.xyz</a>
          </p>
        </div>

      </main>
    </div>
  )
}
