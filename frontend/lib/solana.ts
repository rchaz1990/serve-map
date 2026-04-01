import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { IDL } from './idl'

export const PROGRAM_ID = new PublicKey('9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE')

export const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

// Minimal wallet interface Anchor needs — fulfilled by a raw Keypair on localnet.
export interface DemoWallet {
  publicKey: PublicKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: (tx: any) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: (txs: any[]) => Promise<any[]>
}

export function keypairToWallet(kp: Keypair): DemoWallet {
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => { tx.sign(kp); return tx },
    signAllTransactions: async (txs) => { txs.forEach((tx) => tx.sign(kp)); return txs },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProgram(wallet: DemoWallet): Program<any> {
  const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
  return new Program(IDL as any, provider)
}

/**
 * Returns a persistent demo keypair stored in localStorage.
 * On first call (or missing balance) requests an airdrop so the wallet
 * is always funded on localnet.
 */
export async function getOrCreateDemoKeypair(): Promise<Keypair> {
  const STORAGE_KEY = 'slate-demo-keypair'
  let kp: Keypair

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(stored)))
  } else {
    kp = Keypair.generate()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)))
  }

  // Top up if under 0.5 SOL so transactions never fail due to rent.
  try {
    const balance = await connection.getBalance(kp.publicKey)
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(sig)
    }
  } catch {
    // Localnet might not be running yet — swallow and let the tx fail with a clear error.
  }

  return kp
}

/**
 * Derives the ServerProfile PDA for a given owner wallet.
 * Seeds: ["server_profile", owner]
 */
export function deriveServerProfilePDA(ownerPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('server_profile'), ownerPubkey.toBuffer()],
    PROGRAM_ID
  )
  return pda
}
