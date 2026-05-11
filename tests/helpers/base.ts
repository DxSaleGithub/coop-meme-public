import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { CoopMeme } from '../../target/types/coop_meme';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { sha256 } from '@noble/hashes/sha2';

export { anchor, BN, PublicKey, Keypair };
export { MPL_TOKEN_METADATA_PROGRAM_ID };
export { getAssociatedTokenAddress };

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.CoopMeme as Program<CoopMeme>;

export const affiliate = provider.wallet.publicKey;

// Raydium CPMM addresses — chosen by environment at module load time.
// devnet  →  DRaycpLY…  (the mainnet production contracts)
// localnet / mainnet              →  CPMMoo8L…  (the devnet contracts)
const _rpc = provider.connection.rpcEndpoint;
const _isDevnet = _rpc.includes('devnet');
const _isLocalnet =
  _rpc.includes('localhost') || _rpc.includes('127.0.0.1');

const RAYDIUM_DEVNET = {
  cpSwapProgram: new PublicKey(
    'DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb',
  ),
  ammConfig: new PublicKey(
    'HTVWgp8CbUsRNmRE1p9RBYqopxe2qiyApSkiTFLrfxaW',
  ),
  createPoolFee: new PublicKey(
    '3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy',
  ),
};

const RAYDIUM_MAINNET = {
  cpSwapProgram: new PublicKey(
    'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  ),
  ammConfig: new PublicKey(
    'D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2',
  ),
  createPoolFee: new PublicKey(
    'DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8',
  ),
};

const _raydium = _isDevnet ? RAYDIUM_DEVNET : RAYDIUM_MAINNET;

export const teamWallet = _isDevnet
  ? new PublicKey('4v1BCT6qefpmKNfgKD1hAZSgnZTFwPadYedGDAWTkN53')
  : new PublicKey('DczcCAEB3Fo3gd8ahDXjK4qp4geKDF69Xg1XDMcBDZPo');
export const cpSwapProgram = _raydium.cpSwapProgram;
export const ammConfig = _raydium.ammConfig;
export const createPoolFee = _raydium.createPoolFee;

// Singleton keypair — shared across all test files in the same process
export const trader2Keypair = Keypair.generate();

/** sha256(name || symbol || logo) — the hash used as the TokenOption PDA seed */
export function hashOption(
  name: string,
  symbol: string,
  logo: string,
): Uint8Array {
  return sha256(name + symbol + logo);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function logTx(sig: string): Promise<void> {
  const tx = await provider.connection.getTransaction(sig, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || !tx.meta) {
    console.error('Transaction or metadata not found');
  } else {
    console.log(tx.meta.logMessages);
  }
}

/**
 * Derives all PDAs and ATAs for the current (or upcoming) coop token.
 * Pass create=true when about to call createToken (seeds the next token id).
 * Pass create=false to reference the most recently created token.
 */
export async function setup(create: boolean) {
  let localOwner = new PublicKey(
    '7VM5bv4p6H8bCktwVm5CSvFezaDTKeWji6ojTnGEprnL',
  );
  let mainnetOwner = new PublicKey(
    '4v1BCT6qefpmKNfgKD1hAZSgnZTFwPadYedGDAWTkN53',
  );
  const owner = _isDevnet || _isLocalnet ? localOwner : mainnetOwner;
  const creator = provider.wallet.publicKey;
  const trader = provider.wallet.publicKey;
  const trader2 = trader2Keypair.publicKey;
  const user = provider.wallet.publicKey;
  const user2 = trader2Keypair.publicKey;

  const [configPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('config')],
    program.programId,
  );
  console.log('config pda', configPda.toString());

  const config = await program.account.configData.fetch(configPda);

  const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('roles')],
    program.programId,
  );

  const [globalVault] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    program.programId,
  );

  const totalCoopCreated = new BN(
    create ? config.totalCoopCreated : config.totalCoopCreated - 1,
  );
  console.log('total coop created', totalCoopCreated);

  const seedBuffer = totalCoopCreated
    .addn(1)
    .toArrayLike(Buffer, 'le', 4);

  const coopTokenNonce = 1;
  const nonceBytes = Buffer.alloc(8);
  nonceBytes.writeBigUInt64LE(BigInt(coopTokenNonce), 0);

  const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('mint'), creator.toBuffer(), seedBuffer, nonceBytes],
    program.programId,
  );

  const [userData] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('user'), trader.toBuffer(), coopToken.toBuffer()],
    program.programId,
  );

  const [user2Data] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('user'), trader2.toBuffer(), coopToken.toBuffer()],
    program.programId,
  );

  const [voteOptionsRegistry] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('options'), coopToken.toBuffer()],
      program.programId,
    );

  const [memecoinPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('memecoin'), coopToken.toBuffer()],
    program.programId,
  );

  const metadataProgramId = new PublicKey(
    MPL_TOKEN_METADATA_PROGRAM_ID,
  );

  const [metadataPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      metadataProgramId.toBuffer(),
      coopToken.toBuffer(),
    ],
    metadataProgramId,
  );

  const [globalTokenAta] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        globalVault.toBuffer(),
        anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
        coopToken.toBuffer(),
      ],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    );

  const voteTokenAta = await getAssociatedTokenAddress(
    coopToken,
    memecoinPda,
    true,
  );

  const traderTokenAta = await getAssociatedTokenAddress(
    coopToken,
    trader,
    false,
  );

  const trader2TokenAta = await getAssociatedTokenAddress(
    coopToken,
    trader2,
    false,
  );

  const [userTokenVotes] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('votes'), user.toBuffer(), coopToken.toBuffer()],
      program.programId,
    );

  const [user2TokenVotes] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('votes'), user2.toBuffer(), coopToken.toBuffer()],
      program.programId,
    );

  const userTokenAta = await getAssociatedTokenAddress(
    coopToken,
    user,
    false,
  );
  const userToken2Ata = await getAssociatedTokenAddress(
    coopToken,
    user2,
    false,
  );

  return {
    owner,
    creator,
    trader,
    trader2Keypair,
    trader2,
    user,
    user2,
    configPda,
    rbac,
    globalVault,
    coopToken,
    coopTokenNonce,
    memecoinPda,
    metadataPda,
    globalTokenAta,
    voteTokenAta,
    traderTokenAta,
    trader2TokenAta,
    userTokenVotes,
    user2TokenVotes,
    userTokenAta,
    userToken2Ata,
    userData,
    user2Data,
    voteOptionsRegistry,
  };
}
