import { PublicKey } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai'; // optional for testing

export async function findVanityPDA(
  programId: anchor.web3.PublicKey,
  baseSeeds: Buffer[],
  targetSuffix: string = 'coop',
  maxAttempts: number = 10_000_000
): Promise<{ pda: PublicKey; nonce: number; bump: number } | null> {
  const programPubkey = new PublicKey(programId);

  for (let nonce = 0; nonce < maxAttempts; nonce++) {
    // Append nonce as 8-byte little-endian to seeds
    const nonceBytes = Buffer.alloc(8);
    nonceBytes.writeBigUInt64LE(BigInt(nonce), 0);

    const seeds = [...baseSeeds, nonceBytes];

    try {
      const [pda, bump] = PublicKey.findProgramAddressSync(
        seeds.map((seed) =>
          Buffer.isBuffer(seed) ? seed : Buffer.from(seed)
        ),
        programPubkey
      );

      const addrStr = pda.toBase58();
      if (
        // addrStr.endsWith('coop') ||
        // addrStr.endsWith('cooP') ||
        // addrStr.endsWith('coOp') ||
        // addrStr.endsWith('coOP') ||
        // addrStr.endsWith('cOop') ||
        // addrStr.endsWith('cOoP') ||
        // addrStr.endsWith('cOOp') ||
        // addrStr.endsWith('cOOP') ||
        // addrStr.endsWith('Coop') ||
        // addrStr.endsWith('CooP') ||
        // addrStr.endsWith('CoOp') ||
        // addrStr.endsWith('CoOP') ||
        // addrStr.endsWith('COop') ||
        // addrStr.endsWith('COoP') ||
        // addrStr.endsWith('COOp') ||
        // addrStr.endsWith('COOP')

        addrStr.endsWith(targetSuffix)
      ) {
        console.log(`✅ Found vanity PDA: ${addrStr}`);
        console.log(`Nonce: ${nonce}, Bump: ${bump}`);
        return { pda, nonce, bump };
      }
    } catch (e) {
      // Invalid seeds, continue
    }

    // Progress indicator
    if (nonce % 100_000 === 0) {
      console.log(`Searched ${nonce.toLocaleString()}...`);
    }
  }

  console.log(
    `❌ No match found after ${maxAttempts.toLocaleString()} attempts`
  );
  return null;
}

// // Usage example - pump.fun style program ID
// const COOP_MEME_PROGRAM =
//   '8EFH8uJyQFwcxUXAqhbLNSf6kNnANidbz4gPHa2QNrzW';
// const totalCoopCreated = new BN(0); // e.g., 0

// const seedBuffer = totalCoopCreated
//   .addn(1)
//   .toArrayLike(Buffer, 'le', 4); // u64 LE

// findVanityPDA(COOP_MEME_PROGRAM, [
//   Buffer.from('mint'),
//   seedBuffer,
// ]).then((result) => {
//   if (result) {
//     console.log('Success!', result);
//   }
// });
