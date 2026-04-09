import Navbar from '@/app/components/Navbar'

const SECTIONS = [
  {
    title: 'Eligibility',
    body: [
      {
        subtitle: '',
        text: 'You must be at least 18 years of age to use Slate. By creating an account you represent and warrant that you are 18 or older. If we discover you are under 18 we will terminate your account immediately.',
      },
    ],
  },
  {
    title: 'Free for Servers and Bartenders',
    body: [
      {
        subtitle: '',
        text: 'Slate is permanently free for every server and bartender. No subscription fees. No transaction fees. No premium tiers. No exceptions. This is a core commitment of the Slate platform and will not change.',
      },
    ],
  },
  {
    title: 'Ratings and Reviews',
    body: [
      {
        subtitle: 'Genuine experiences only',
        text: 'Ratings submitted on Slate must reflect a genuine, first-hand dining or hospitality experience with the server or bartender being rated. You may only submit a rating if you were physically present at the venue and personally served by that individual.',
      },
      {
        subtitle: 'No fake or fraudulent reviews',
        text: 'Submitting a rating you know to be false, coordinating with others to manipulate a server\'s rating, or submitting ratings without a genuine dining experience is strictly prohibited. Fraudulent reviews harm real workers whose livelihoods depend on the integrity of Slate\'s reputation system.',
      },
      {
        subtitle: 'Permanence',
        text: 'Ratings are written to the Solana blockchain and are permanent. They cannot be edited or deleted after submission. Please rate thoughtfully and honestly.',
      },
    ],
  },
  {
    title: 'Prohibited Conduct',
    body: [
      {
        subtitle: '',
        text: 'You agree not to: submit fraudulent ratings or vibe reports; harass, threaten, or abuse any server, bartender, guest, or venue; impersonate another person or create false accounts; attempt to manipulate the $SERVE reward distribution system; reverse engineer, scrape, or exploit the Slate platform; or use Slate for any unlawful purpose.',
      },
    ],
  },
  {
    title: '$SERVE Token',
    body: [
      {
        subtitle: 'No guaranteed value',
        text: '$SERVE tokens earned through the Slate platform have no guaranteed monetary value. Token value fluctuates based on market conditions beyond Slate\'s control. Earning $SERVE rewards does not constitute a promise of any specific financial return.',
      },
      {
        subtitle: 'Not investment advice',
        text: 'Nothing in the Slate platform or communications constitutes financial, investment, or legal advice. $SERVE is a utility token designed to reward participation in the Slate ecosystem. You are solely responsible for any decisions you make regarding $SERVE.',
      },
      {
        subtitle: 'Regulatory compliance',
        text: 'You are responsible for understanding and complying with any tax obligations or regulations applicable to cryptocurrency tokens in your jurisdiction.',
      },
    ],
  },
  {
    title: 'Account Termination',
    body: [
      {
        subtitle: '',
        text: 'Slate reserves the right to suspend or permanently terminate any account that violates these Terms of Service, submits fraudulent ratings, engages in abusive behavior, or otherwise harms the integrity of the platform or the workers on it. We will use reasonable judgment in making these determinations. Terminated accounts forfeit any pending $SERVE rewards.',
      },
    ],
  },
  {
    title: 'Blockchain Data',
    body: [
      {
        subtitle: '',
        text: 'Certain Slate data — including ratings, follow relationships, and token balances — is stored on the Solana blockchain and is public by nature. You acknowledge and accept that data written to the blockchain cannot be deleted by Slate or any other party.',
      },
    ],
  },
  {
    title: 'Disclaimer of Warranties',
    body: [
      {
        subtitle: '',
        text: 'Slate is provided "as is" without warranties of any kind, express or implied. We do not warrant that the platform will be error-free, uninterrupted, or that ratings accurately reflect the quality of any server or bartender. Use Slate at your own discretion.',
      },
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      {
        subtitle: '',
        text: 'To the fullest extent permitted by law, Slate shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of $SERVE tokens, reputational harm, or loss of income.',
      },
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      {
        subtitle: '',
        text: 'We may update these Terms of Service from time to time. Material changes will be communicated by email. Continued use of Slate after updated terms are posted constitutes acceptance.',
      },
    ],
  },
  {
    title: 'Contact',
    body: [
      {
        subtitle: '',
        text: 'Questions about these Terms? Contact us at team@slatenow.xyz.',
      },
    ],
  },
]

export default function TermsPage() {
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
            Terms of Service
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
