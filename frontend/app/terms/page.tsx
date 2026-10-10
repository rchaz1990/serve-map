import Navbar from '@/app/components/Navbar'
import { legalEffectiveLabel } from '@/lib/legal'

const SECTIONS = [
  {
    title: 'Agreeing to These Terms',
    body: [
      {
        subtitle: '',
        text: 'You agree to these Terms and the Privacy Policy by ticking the agreement box when you create a server or bartender profile, before your first rating or follow, or — if your server or bartender profile was created earlier — before you next use your dashboard. We record which version you agreed to and when.',
      },
    ],
  },
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
    title: 'Pricing for Servers and Bartenders',
    body: [
      {
        subtitle: '',
        text: 'Slate is currently free for servers and bartenders: no subscription fees and no transaction fees. If we ever introduce charges for servers or bartenders, we will tell you in advance and ask you to agree before they apply to you.',
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
        subtitle: 'Removal',
        text: 'Ratings are stored by Slate. Slate may remove any rating that breaks these Terms. Ratings cannot be edited after you submit them, so please rate thoughtfully and honestly. You can ask us to delete a rating you wrote, or your account; see the Privacy Policy.',
      },
    ],
  },
  {
    title: 'Location Checks',
    body: [
      {
        subtitle: '',
        text: 'Vibe reports and shifts may use your device location to check that you are near the venue. Your coordinates are used only for that check and are not stored. These checks rely on your device and are not proof of presence. Do not misrepresent where you are. See the Privacy Policy for what is stored and who can see it.',
      },
    ],
  },
  {
    title: 'Prohibited Conduct',
    body: [
      {
        subtitle: '',
        text: 'You agree not to: submit fraudulent ratings or vibe reports; harass, threaten, or abuse any server, bartender, guest, or venue; impersonate another person or create false accounts; attempt to manipulate Slate Points or any reward system; reverse engineer, scrape, or exploit the Slate platform; or use Slate for any unlawful purpose.',
      },
    ],
  },
  {
    title: 'Slate Points and $SERVE',
    body: [
      {
        subtitle: 'Slate Points',
        text: 'Slate Points are a record of recognition on Slate. They are not a cryptocurrency, have no cash value, and cannot be sold, transferred, or exchanged. Slate may change how points are earned or end the points program.',
      },
      {
        subtitle: '$SERVE',
        text: '$SERVE is a reward token Slate plans to develop. It has not been issued. Slate does not promise that $SERVE will launch, or that Slate Points will convert into $SERVE or any other asset. If $SERVE launches, it will be governed by its own terms.',
      },
      {
        subtitle: 'Not investment advice',
        text: 'Nothing in the Slate platform or communications constitutes financial, investment, or legal advice.',
      },
    ],
  },
  {
    title: 'Account Termination',
    body: [
      {
        subtitle: '',
        text: 'Slate reserves the right to suspend or permanently terminate any account that violates these Terms of Service, submits fraudulent ratings, engages in abusive behavior, or otherwise harms the integrity of the platform or the workers on it. We will use reasonable judgment in making these determinations. Terminated accounts forfeit their Slate Points.',
      },
    ],
  },
  {
    title: 'Blockchain Features',
    body: [
      {
        subtitle: '',
        text: 'Slate does not store ratings, follows, or Slate Points on a blockchain today. We may explore blockchain features in the future to make worker records more portable; there is no guarantee we will. If we do, we will update these Terms, explain what would be stored on-chain, and ask you to agree before anything applies to you.',
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
        text: 'To the fullest extent permitted by law, Slate shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of Slate Points, reputational harm, or loss of income.',
      },
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      {
        subtitle: '',
        text: 'We may update these Terms of Service from time to time. For material changes we will update the date above and ask you to agree again before you next create a profile, submit a rating, follow someone, or use your server or bartender dashboard, and may also email you.',
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
          <p className="text-sm" style={{ color: '#606060' }} data-testid="legal-effective">{legalEffectiveLabel()}</p>
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
