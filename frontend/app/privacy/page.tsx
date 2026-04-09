import Navbar from '@/app/components/Navbar'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      {
        subtitle: 'Account information',
        text: 'When you create a Slate account we collect your name, email address, and — for servers and bartenders — your current restaurant or bar. This information is used to create and identify your profile.',
      },
      {
        subtitle: 'Location data',
        text: 'When you submit a vibe report or rating, Slate checks your device location once to verify you are physically present at the venue. This check happens in real time and the result (verified or not verified) is recorded. Your precise location coordinates are never stored on our servers.',
      },
      {
        subtitle: 'Ratings and reviews',
        text: 'When you submit a rating for a server or bartender, the rating score and any written comment are stored. Because ratings are written to the Solana blockchain, they are public by nature and permanently associated with the server\'s on-chain profile.',
      },
      {
        subtitle: 'Usage data',
        text: 'We collect standard analytics data including pages visited, features used, and device type. This data is aggregated and used only to improve the Slate product.',
      },
    ],
  },
  {
    title: 'How We Use Your Information',
    body: [
      {
        subtitle: 'To verify ratings',
        text: 'Location data is used in real time to confirm you are at a venue before allowing a rating or vibe report. This prevents fraudulent reviews and protects the integrity of every server\'s reputation.',
      },
      {
        subtitle: 'To send notifications',
        text: 'If you follow a server on Slate, we use your email or push notification settings to alert you when that server starts a shift at a new venue. You can unsubscribe from notifications at any time.',
      },
      {
        subtitle: 'To distribute $SERVE rewards',
        text: 'For servers and bartenders, we use your verified rating history and activity data to calculate weekly $SERVE token rewards. Your public key is used to receive token distributions directly on-chain.',
      },
      {
        subtitle: 'To operate the platform',
        text: 'We use account information to authenticate users, resolve disputes, and respond to support requests.',
      },
    ],
  },
  {
    title: 'Blockchain and Public Data',
    body: [
      {
        subtitle: 'What goes on-chain',
        text: 'Ratings, follow relationships, and $SERVE token balances are stored on the Solana blockchain. Blockchain data is public by nature — anyone can view on-chain transactions. We do not store sensitive personal information such as email addresses or phone numbers on-chain.',
      },
      {
        subtitle: 'Permanence',
        text: 'Once a rating is written to the blockchain it is permanent and cannot be deleted — by Slate or by anyone else. This is a feature, not a limitation: it ensures servers\' verified reputations can never be taken away. Please rate honestly.',
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
        text: 'We work with a small number of trusted service providers (authentication, analytics, payment processing) who access data only as necessary to provide their services and are contractually required to protect it.',
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
        text: 'You can view and update your account information at any time through your Slate profile settings.',
      },
      {
        subtitle: 'Account deletion',
        text: 'You can request deletion of your Slate account and associated personal data by emailing team@slatenow.xyz. Note that on-chain ratings you have submitted cannot be deleted due to the immutable nature of blockchain records.',
      },
      {
        subtitle: 'Notification preferences',
        text: 'You can manage or disable notifications at any time through your account settings.',
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
          <p className="text-sm" style={{ color: '#606060' }}>Effective April 2026</p>
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
