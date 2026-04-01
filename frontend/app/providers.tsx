'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="clpisbn4p00enjn0fxu5ciu2o"
      config={{
        // Show email and Google as the only login options.
        loginMethods: ['email', 'google'],
        appearance: {
          // Pure black background matches the Slate design system.
          theme: '#000000',
          // White accent so Privy's buttons and borders stay on-brand.
          accentColor: '#FFFFFF',
          landingHeader: 'Welcome to Slate',
          loginMessage: 'Sign in to book tables and follow your favourite servers.',
        },
        embeddedWallets: {
          // Create a Solana wallet silently for every new user — no crypto
          // knowledge required. The wallet powers $SERVE token rewards.
          // v3+ requires createOnLogin nested per chain, not at the top level.
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
