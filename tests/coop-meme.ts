import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { CoopMeme } from '../target/types/coop_meme';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from '@solana/spl-token';
import { token } from '@coral-xyz/anchor/dist/cjs/utils';
import { assert } from 'chai';

import { ComputeBudgetProgram } from '@solana/web3.js';

describe('coop-meme-2', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CoopMeme as Program<CoopMeme>;
  let teamWallet = new PublicKey(
    'An7Lica1BAXqKuY5ScViHwBnQLqnUQt1eYmDvHgYdaMQ'
  );
  let affiliate = provider.wallet.publicKey;

  let cpSwapProgram = new PublicKey(
    'CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW'
  );

  let ammConfig = new PublicKey(
    '9zSzfkYy6awexsHvmggeH36pfVUdDGyCcwmjT3AQPBj6'
  );

  let createPoolFee = new PublicKey(
    'G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2'
  );

  const computeBudgetIx = ComputeBudgetProgram.requestUnits({
    units: 400_000, // Request more compute units, e.g. 400k
    additionalFee: 0,
  });

  it.skip('Is initialized!', async () => {
    // Add your test here.

    const tx = await program.methods.initialize(teamWallet).rpc();
    console.log('Your transaction signature', tx);

    console.log(program.programId);

    const [configAda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('config')],
        program.programId
      );

    const configState = await program.account.configData.fetch(
      configAda
    );
    console.log('Config state data:', configState);
  });

  it.skip('updates the config', async () => {
    const owner = provider.wallet.publicKey;

    const [configPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('config')],
        program.programId
      );

    const configState = await program.account.configData.fetch(
      configPda
    );
    console.log('Config state data:', configState);

    const newOwnerFee = new anchor.BN(2000);
    const newCoopInterval = new anchor.BN(1200);
    const newInitVirtualSol = new anchor.BN(2_000_000_000); // 2 SOL in lamports
    const newInitVirtualToken = new anchor.BN('2000000000000000000'); // 2 billion tokens

    await program.methods
      .updateConfig(
        null,
        newOwnerFee,
        null,
        null,
        null,
        newCoopInterval,
        null,
        null,
        null,
        newInitVirtualSol,
        newInitVirtualToken
      )
      .accounts({
        owner,
        config: configPda,
      })
      .rpc();

    const config = await program.account.configData.fetch(configPda);

    console.log('Config state data:', config);

    assert.strictEqual(config.ownerFee, newOwnerFee.toNumber());
    assert.strictEqual(
      config.coopInterval.toNumber(),
      newCoopInterval.toNumber()
    );
    assert.strictEqual(
      config.initVirtualSol.toString(),
      newInitVirtualSol.toString()
    );
    assert.strictEqual(
      config.initVirtualToken.toString(),
      newInitVirtualToken.toString()
    );
  });

  it.skip('Is creating memecoin!', async () => {
    const creator = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);
    console.log('Config state data:', config);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    console.log('globalVault', globalVault);

    const totalCoopCreated = new BN(config.totalCoopCreated); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
      program.programId
    );

    console.log('coopToken latest', coopToken);

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId
      );

    const metadataProgramId = new PublicKey(
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    const [metadataPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          metadataProgramId.toBuffer(),
          coopToken.toBuffer(),
        ],
        metadataProgramId
      );

    const [globalTokenAta] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          globalVault.toBuffer(),
          anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
          coopToken.toBuffer(),
        ],
        anchor.utils.token.ASSOCIATED_PROGRAM_ID
      );

    const tx = await program.methods
      .createToken(
        new BN('1000000000000000000'),
        new BN('1000'),
        'Coop Test Token',
        'CTT',
        'uri'
      )
      .accounts({
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        tokenMetadataAccount: metadataPda,
        globalTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' // Update if needed
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('Tx hash:', tx);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda
    );
    console.log('Memecoin state data:', memecoinState);
  });

  it.skip('Is buying memecoin!', async () => {
    const trader = provider.wallet.publicKey;
    const creator = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
      program.programId
    );

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId
      );

    const [globalTokenAta] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          globalVault.toBuffer(),
          anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
          coopToken.toBuffer(),
        ],
        anchor.utils.token.ASSOCIATED_PROGRAM_ID
      );

    const traderTokenAta = await getAssociatedTokenAddress(
      coopToken,
      trader,
      false // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const tx = await program.methods
      .buyTokens(new BN(1_000_000_00), new BN(0))
      .accounts({
        trader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        traderTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' // Update if needed
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Tx hash:', tx);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda
    );
    console.log('Memecoin state data:', memecoinState);
  });

  it.skip('Is selling memecoin!', async () => {
    const trader = provider.wallet.publicKey;
    const creator = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
      program.programId
    );

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId
      );

    const [globalTokenAta] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          globalVault.toBuffer(),
          anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
          coopToken.toBuffer(),
        ],
        anchor.utils.token.ASSOCIATED_PROGRAM_ID
      );

    const traderTokenAta = await getAssociatedTokenAddress(
      coopToken,
      trader,
      false // allowOwnerOffCurve = false (always false unless you know it's needed)
    );
    let userTokenBal =
      await provider.connection.getTokenAccountBalance(
        traderTokenAta
      );

    const tx = await program.methods
      .sellTokens(new BN(userTokenBal.value.amount), new BN(0))
      .accounts({
        trader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        traderTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' // Update if needed
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Tx hash:', tx);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda
    );
    console.log(
      'Memecoin state data:',
      memecoinState.tokenMarketEndTime.toString()
    );
  });

  it.skip('Is listing memecoin!', async () => {
    const owner = provider.wallet.publicKey;
    const creator = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    console.log('global vault', globalVault);

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
      program.programId
    );

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId
      );
    const memecoinData = await program.account.memeCoinData.fetch(
      memecoinPda
    );

    console.log(
      'real token reserves',
      memecoinData.realTokenReserves.toString()
    );

    // const globalWsolAccount = await getAssociatedTokenAddress(
    //   NATIVE_MINT,
    //   globalVault,
    //   true
    // );

    // const sig = await program.provider.sendAndConfirm(
    //   new Transaction().add(
    //     SystemProgram.transfer({
    //       fromPubkey: program.provider.publicKey,
    //       toPubkey: ownerWsolAccount,
    //       lamports: 100000000,
    //     })
    //   )
    // );

    const [globalTokenAta] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          globalVault.toBuffer(),
          anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
          coopToken.toBuffer(),
        ],
        anchor.utils.token.ASSOCIATED_PROGRAM_ID
      );

    console.log('global token ata', globalTokenAta);

    const token0Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? coopToken
        : NATIVE_MINT;
    const token1Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? NATIVE_MINT
        : coopToken;

    const ownerToken0 = await getAssociatedTokenAddress(
      token0Mint,
      owner,
      false // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      owner,
      false
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram // this is NOT your current program ID
    );

    // const ownerLpToken = await getAssociatedTokenAddress(
    //   lpMint,
    //   owner,
    //   false // allowOwnerOffCurve — if needed
    // );

    const [ownerLpToken] = await PublicKey.findProgramAddress(
      [
        creator.toBuffer(),
        anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
        lpMint.toBuffer(),
      ],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID
    );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram
      );

    const txSig = await program.methods
      .listToken()
      .accounts({
        owner, // fine
        creator, // fine
        teamWallet, // fine
        config: configPda, // fine
        globalVault, // fine
        token0Mint,
        token1Mint,
        coopToken, // fine
        memecoin: memecoinPda, // fine
        // globalWsolAccount,
        globalTokenAta, // fine
        ownerToken0, // fine
        ownerToken1,
        nativeMint: NATIVE_MINT, // fine
        lpMint,
        ownerLpToken,
        token0Vault,
        token1Vault,
        createPoolFee,
        observationState,
        cpSwapProgram, // fine
        ammConfig, // fine
        authority,
        poolState, // fine
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ])
      .rpc();

    console.log('Tx hash:', txSig);
    const tx = await provider.connection.getTransaction(txSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || !tx.meta) {
      console.error('Transaction or metadata not found');
    } else {
      console.log(tx.meta.logMessages);
    }
    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda
    );
    console.log(
      'Memecoin state data:',
      memecoinState.tokenMarketEndTime.toString()
    );

    const configState = await program.account.configData.fetch(
      configPda
    );
    console.log('Config state data:', configState);
  });

  it.skip('Is swapping SOL to memecoin!', async () => {
    const payer = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    console.log('global vault', globalVault);

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), payer.toBuffer(), seedBuffer],
      program.programId
    );

    // const [memecoinPda] =
    //   anchor.web3.PublicKey.findProgramAddressSync(
    //     [Buffer.from('memecoin'), coopToken.toBuffer()],
    //     program.programId
    //   );
    // const memecoinData = await program.account.memeCoinData.fetch(
    //   memecoinPda
    // );

    // console.log(
    //   'real token reserves',
    //   memecoinData.realTokenReserves.toString()
    // );

    // const globalWsolAccount = await getAssociatedTokenAddress(
    //   NATIVE_MINT,
    //   globalVault,
    //   true
    // );

    // const sig = await program.provider.sendAndConfirm(
    //   new Transaction().add(
    //     SystemProgram.transfer({
    //       fromPubkey: program.provider.publicKey,
    //       toPubkey: ownerWsolAccount,
    //       lamports: 100000000,
    //     })
    //   )
    // );

    // const [globalTokenAta] =
    //   anchor.web3.PublicKey.findProgramAddressSync(
    //     [
    //       globalVault.toBuffer(),
    //       anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
    //       coopToken.toBuffer(),
    //     ],
    //     anchor.utils.token.ASSOCIATED_PROGRAM_ID
    //   );

    // console.log('global token ata', globalTokenAta);

    const token0Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? coopToken
        : NATIVE_MINT;
    const token1Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? NATIVE_MINT
        : coopToken;

    const ownerToken0 = await getAssociatedTokenAddress(
      token0Mint,
      payer,
      false // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram // this is NOT your current program ID
    );

    // const ownerLpToken = await getAssociatedTokenAddress(
    //   lpMint,
    //   owner,
    //   false // allowOwnerOffCurve — if needed
    // );

    // const [ownerLpToken] = await PublicKey.findProgramAddress(
    //   [
    //     creator.toBuffer(),
    //     anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
    //     lpMint.toBuffer(),
    //   ],
    //   anchor.utils.token.ASSOCIATED_PROGRAM_ID
    // );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram
      );

    const txSig = await program.methods
      .swapTokenBaseInput(new BN(10000000), new BN(0))
      .accounts({
        payer, // fine
        cpSwapProgram,
        authority: authority,
        ammConfig,
        poolState,
        inputTokenAccount: ownerToken0,
        outputTokenAccount: ownerToken1,
        inputVault: token0Vault,
        outputVault: token1Vault,
        inputTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        outputTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        inputTokenMint: token0Mint,
        outputTokenMint: token1Mint,
        observationState,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ])
      .rpc();

    console.log('Tx hash:', txSig);
    const tx = await provider.connection.getTransaction(txSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || !tx.meta) {
      console.error('Transaction or metadata not found');
    } else {
      console.log(tx.meta.logMessages);
    }
    // const memecoinState = await program.account.memeCoinData.fetch(
    //   memecoinPda
    // );
    // console.log(
    //   'Memecoin state data:',
    //   memecoinState.tokenMarketEndTime.toString()
    // );

    const configState = await program.account.configData.fetch(
      configPda
    );
    console.log('Config state data:', configState);
  });

  it('Is swapping memecoin to SOL!', async () => {
    const payer = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId
      );

    console.log('global vault', globalVault);

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), payer.toBuffer(), seedBuffer],
      program.programId
    );

    // const [memecoinPda] =
    //   anchor.web3.PublicKey.findProgramAddressSync(
    //     [Buffer.from('memecoin'), coopToken.toBuffer()],
    //     program.programId
    //   );
    // const memecoinData = await program.account.memeCoinData.fetch(
    //   memecoinPda
    // );

    // console.log(
    //   'real token reserves',
    //   memecoinData.realTokenReserves.toString()
    // );

    // const globalWsolAccount = await getAssociatedTokenAddress(
    //   NATIVE_MINT,
    //   globalVault,
    //   true
    // );

    // const sig = await program.provider.sendAndConfirm(
    //   new Transaction().add(
    //     SystemProgram.transfer({
    //       fromPubkey: program.provider.publicKey,
    //       toPubkey: ownerWsolAccount,
    //       lamports: 100000000,
    //     })
    //   )
    // );

    // const [globalTokenAta] =
    //   anchor.web3.PublicKey.findProgramAddressSync(
    //     [
    //       globalVault.toBuffer(),
    //       anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
    //       coopToken.toBuffer(),
    //     ],
    //     anchor.utils.token.ASSOCIATED_PROGRAM_ID
    //   );

    // console.log('global token ata', globalTokenAta);

    const token0Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? coopToken
        : NATIVE_MINT;
    const token1Mint =
      Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
        ? NATIVE_MINT
        : coopToken;

    const ownerToken0 = await getAssociatedTokenAddress(
      token0Mint,
      payer,
      false // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram // this is NOT your current program ID
    );

    // const ownerLpToken = await getAssociatedTokenAddress(
    //   lpMint,
    //   owner,
    //   false // allowOwnerOffCurve — if needed
    // );

    // const [ownerLpToken] = await PublicKey.findProgramAddress(
    //   [
    //     creator.toBuffer(),
    //     anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
    //     lpMint.toBuffer(),
    //   ],
    //   anchor.utils.token.ASSOCIATED_PROGRAM_ID
    // );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram
      );

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(ownerToken1);

    const txSig = await program.methods
      .swapTokenBaseOutput(
        new BN(userTokenBal.value.amount),
        new BN(1_00_00_00)
      )
      .accounts({
        payer, // fine
        cpSwapProgram,
        authority: authority,
        ammConfig,
        poolState,
        inputTokenAccount: ownerToken1,
        outputTokenAccount: ownerToken0,
        inputVault: token1Vault,
        outputVault: token0Vault,
        inputTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        outputTokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        inputTokenMint: token1Mint,
        outputTokenMint: token0Mint,
        observationState,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ])
      .rpc();

    console.log('Tx hash:', txSig);
    const tx = await provider.connection.getTransaction(txSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || !tx.meta) {
      console.error('Transaction or metadata not found');
    } else {
      console.log(tx.meta.logMessages);
    }
    // const memecoinState = await program.account.memeCoinData.fetch(
    //   memecoinPda
    // );
    // console.log(
    //   'Memecoin state data:',
    //   memecoinState.tokenMarketEndTime.toString()
    // );

    const configState = await program.account.configData.fetch(
      configPda
    );
    console.log('Config state data:', configState);
  });
});
