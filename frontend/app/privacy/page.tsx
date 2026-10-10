import Navbar from '@/app/components/Navbar'
import { legalEffectiveLabel } from '@/lib/legal'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      {
        subtitle: 'Account information',
        text: 'When you create a Slate account we collect your name and email address. Servers and bartenders also provide the venues they work at and may add a photo, bio, specialties, phone number, and Instagram handle. This information is used to create and identify your profile. When you agree to these policies, we record which version you agreed to and when.',
      },
      {
        subtitle: 'Location data',
        text: 'When you report a venue\'s vibe, or start a shift as a server or bartender, Slate asks your browser for your device location to check that you are near the venue. This use is temporary. For a shift, the check happens on your device and your location is not sent to Slate. For a vibe report, your device sends its position to Slate\'s server, which uses it once to work out your distance from the venue. We do not store your coordinates. We keep only the result of the check (passed or not), which others using Slate can see, and your approximate distance from the venue, which only Slate can see. Reports and shifts recorded before this change may still include coordinates; they are not public, and we are reviewing them for deletion. Device location can be inaccurate or changed, so a location check is not proof that someone was there. Ratings do not use your location — they start from scanning the server\'s QR code.',
      },
      {
        subtitle: 'Ratings and reviews',
        text: 'When you rate a server or bartender, your score, any written comment, and any tags you choose are stored by Slate and shown on that person\'s public profile until you or they ask us to delete them. Your name and email address are not shown with your rating. Inside Slate, each rating is linked to your account (by your email address, which is not shown) so we can limit abuse and delete it if you ask. Some older ratings also carry a random account identifier that others using Slate can see; it does not show your name or email.',
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
        text: 'If you follow a server on Slate and choose to get emails, we email you when that server starts a shift. To stop these emails, unfollow the server or contact us.',
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
        text: 'Server and bartender profiles are public: name, photo, role, bio, specialties, workplaces, ratings and comments, follower count, Slate Points, and the venue where you are working while you are on shift. Email addresses, phone numbers, location coordinates and distances from a venue are not public. Who follows a server or bartender is not public: only the follower count is shown, and the server or bartender sees each follower\'s first name and last initial, not their email address.',
      },
      {
        subtitle: 'Blockchain',
        text: 'Slate does not store any data on a blockchain today. We may explore blockchain features in the future to make worker records more portable, but there is no guarantee we will. If we do, we will explain exactly what would be written on-chain, and ask you, before anything is.',
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
        text: 'To ask us to delete your account, email team@slatenow.xyz from the email address on your account. We first verify that the request comes from you; we aim to complete the deletion within 30 days after that verification. For guests, this removes your account, the ratings and comments you wrote (they disappear from the worker\'s profile and the worker\'s rating is recalculated), your follows, the notifications we stored for you, your vibe reports and venue comments, and your Slate Points. For servers and bartenders, this removes your account, your profile and photo, your workplaces and shifts, your followers, and the ratings guests left on your profile.',
      },
      {
        subtitle: 'What we keep after deletion',
        text: 'Slate keeps a record of Slate Points awarded to worker profiles (amounts and dates) that cannot be edited or deleted, and is not public. When a worker profile is deleted, we remove the email address from that record. During our early test, if a guest\'s rating is deleted, the Slate Points the worker already earned from it are not taken back: they stay in the worker\'s balance and in that record. Some copies or logs of deleted data may remain with our service providers (hosting, database, email delivery and newsletter) under those providers\' own retention practices, which we do not control.',
      },
      {
        subtitle: 'Deleting a single rating',
        text: 'You can ask us to delete a rating you wrote without deleting your account, using the same email address. Servers and bartenders can ask us to review a rating on their profile; we remove ratings that break our Terms.',
      },
      {
        subtitle: 'Email notifications',
        text: 'Shift emails stop when you unfollow a server. To stop all Slate emails, contact us.',
      },
    ],
  },
  {
    title: 'How Long We Keep Data',
    body: [
      {
        subtitle: 'While your account is open',
        text: 'We keep your account, profile, ratings, comments and follows while your account is open, or until you ask us to delete them.',
      },
      {
        subtitle: 'During our early test',
        text: 'While Slate is in a limited early test, a member of our team manually reviews accounts and test data that have been inactive for 90 days, and may contact you or delete that data. Nothing is deleted automatically.',
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
        text: 'We may update this Privacy Policy from time to time. When we do we will update the effective date above. For material changes we will ask you to agree again before you next create a profile, submit a rating, follow someone, or use your server or bartender dashboard, and may also email you.',
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
