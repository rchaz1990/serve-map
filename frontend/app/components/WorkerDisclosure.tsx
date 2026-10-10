// What a worker agrees to: shown at worker sign-up and in the dashboard agreement step
// for existing workers. Keep the two in sync by using this component in both places.
export default function WorkerDisclosure() {
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        Your name, photo, workplaces, ratings, comments, follower count and Slate Points are public on Slate.
        Individual followers are not publicly listed.
        You can ask us to delete your profile at any time (team@slatenow.xyz).
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }} data-testid="shift-disclosure">
        <strong className="text-white">Starting a shift is public.</strong> When you start a shift, anyone can
        see which venue you&apos;re working at and that you&apos;re on shift now. Slate may email followers who
        explicitly chose to receive shift emails. If you share your location, it&apos;s used on your phone only to check that
        you&apos;re near the venue — it isn&apos;t sent to Slate or stored. Others can see whether the check passed.
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        <strong className="text-white">Accept to take part.</strong> Until you accept the current Terms of Service
        and Privacy Policy, you can&apos;t receive new followers or ratings, start shifts, or have Slate email your
        followers. Your existing profile, ratings and followers stay as they are.
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        <strong className="text-white">Choose who follows you.</strong> People cannot follow you until you agree to
        the current Terms and Privacy Policy. After that, anyone can follow you unless you turn on follow approval
        in your dashboard settings. With approval on, you approve each follower first. Slate Points have no
        cash value. Ratings are stored by Slate, not on a blockchain.
      </p>
    </>
  )
}
