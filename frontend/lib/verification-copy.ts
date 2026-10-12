// Employment-verification wording.
// DRAFT — pending Vera's review, EXCEPT `AGE_ATTESTATION`, which is Vera's approved wording
// (2026-10-11) and must not be changed. Do not use with real candidates before Vera approves.

export const VERIFICATION_CONSENT_VERSION = 'draft-2026-10-11'

export const AGE_ATTESTATION =
  'I confirm that I am 18 years of age or older. I am providing this information truthfully, and I understand that I cannot participate if I cannot make this confirmation.'

export const VERIFICATION_COPY = {
  title: 'Confirm you work in NYC hospitality',
  intro:
    'Slate’s early test is for people who serve guests at New York City restaurants and bars. Before you can take part, a named member of the Slate team checks one record that shows where you work. This is voluntary. It is separate from the early-test agreement, which you would see only after this check.',
  checks: [
    'that you work at a New York City venue now, or did within the last 60 days;',
    'that your role is server, bartender or another approved guest-facing role;',
    'that your work is mainly serving or bartending (not mainly supervising, events or kitchen);',
    'that you are not already connected to Slate in a way that would affect the test.',
  ],
  accepted: [
    'a recent work schedule;',
    'an employee-portal screen showing the venue and your role;',
    'a heavily redacted recent pay document showing only the venue and your role.',
  ],
  redact: [
    'pay amounts',
    'Social Security number',
    'tax information',
    'home address',
    'bank information',
    'employee number',
    'date of birth',
    'other people’s names or information',
    'passwords or login details',
    'anything unrelated to where you work and your role',
  ],
  retention:
    'Your image is deleted as soon as the check is finished, and automatically if it is not reviewed within 24 hours. Slate keeps only a minimal record: a random ID, the result, your role category, venue, borough, the type of record you showed, when it was checked, who checked it, and when the image was deleted.',
  howTo: 'Take a screenshot (PNG or JPEG, up to 4 MB). Please do not send PDFs, and do not send this record by email, text or social messages.',
  consentLabel:
    'I agree to have one redacted employment record checked as described above. I understand this is voluntary and separate from the early-test agreement.',
  redactedLabel:
    'I have checked the preview and redacted everything on the list above.',
  submitted: 'Thank you. Your record has been sent for review. It will be deleted after the check, or automatically within 24 hours if it is not reviewed.',
  withdrawn: 'You have withdrawn. Any image you sent has been deleted.',
  rejectedFile: 'This file could not be accepted, and it has been deleted. Please contact the Slate team for a new link.',
  invalid: 'This link is not valid. It may have already been used. Please contact the Slate team for a new link.',
  expired: 'This link has expired. Please contact the Slate team for a new link.',
  verifiedIntro: 'Your employment check is complete. Before you see the early-test agreement, please confirm your age.',
  done: 'Thank you. You can now read and accept the early-test agreement.',
} as const
