// What a worker agrees to: shown at worker sign-up and in the dashboard agreement step
// for existing workers. Keep the two in sync by using this component in both places.
export default function WorkerDisclosure() {
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        Before you claim your profile: your name, photo, workplaces, ratings, comments, followers and Slate
        Points are public on Slate.
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }} data-testid="shift-disclosure">
        <strong className="text-white">Starting a shift is public.</strong> When you start a shift, anyone can
        see which venue you&apos;re working at and that you&apos;re on shift now, and Slate may email your
        followers to tell them. If you share your location, we store it with that shift.
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        <strong className="text-white">Choose who follows you.</strong> Anyone can follow you unless you turn on
        follow approval in your dashboard settings; then you approve each follower first. Slate Points have no
        cash value. Ratings are stored by Slate, not on a blockchain.
      </p>
    </>
  )
}
