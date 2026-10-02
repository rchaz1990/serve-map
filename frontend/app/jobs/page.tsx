import { redirect } from 'next/navigation'

/**
 * Product docs / outreach sometimes link /jobs.
 * Real Jobs / Venues UI (Places autocomplete, add venue) lives on the
 * server dashboard — send people there with a section hint for scroll.
 */
export default function JobsRedirectPage() {
  redirect('/dashboard?section=jobs')
}
