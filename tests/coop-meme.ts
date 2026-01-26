import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { CoopMeme } from '../target/types/coop_meme';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from '@solana/spl-token';
// import { sha256, token } from '@coral-xyz/anchor/dist/cjs/utils';
import { assert } from 'chai';
import { sha256 } from '@noble/hashes/sha2';

import { ComputeBudgetProgram } from '@solana/web3.js';
import { tokenAmount } from '@metaplex-foundation/umi';
import { findVanityPDA } from './generate-pda';

describe('coop-meme-2', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CoopMeme as Program<CoopMeme>;
  let teamWallet = new PublicKey(
    '3ntH2aAoCMDLR95iXmUahxdUtTEAvD9WHwxepSi9oAQM',
  );
  let affiliate = provider.wallet.publicKey;
  let cpSwapProgram = new PublicKey(
    'DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb',
  );

  let ammConfig = new PublicKey(
    'HTVWgp8CbUsRNmRE1p9RBYqopxe2qiyApSkiTFLrfxaW',
  );

  let createPoolFee = new PublicKey(
    '3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy',
  );

  // let cpSwapProgram = new PublicKey(
  //   'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
  // );

  // let ammConfig = new PublicKey(
  //   'D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2'
  // );

  // let createPoolFee = new PublicKey(
  //   'DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8'
  // );

  const trader2Keypair = Keypair.generate();

  async function airdropSol() {
    const sig = await program.provider.connection.requestAirdrop(
      trader2Keypair.publicKey,
      100000 * anchor.web3.LAMPORTS_PER_SOL,
    );

    const latestBlockhash =
      await program.provider.connection.getLatestBlockhash();
    await program.provider.connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  }
  async function setup(create) {
    const owner = provider.wallet.publicKey;

    const creator = provider.wallet.publicKey;

    const trader = provider.wallet.publicKey;

    const trader2 = trader2Keypair.publicKey;

    // await airdropSol();

    const user = provider.wallet.publicKey;

    const user2 = trader2Keypair.publicKey;

    const [configPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('config')],
        program.programId,
      );
    console.log('config pda', configPda.toString());
    let config = await program.account.configData.fetch(configPda);

    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId,
      );

    const totalCoopCreated = new BN(
      create ? config.totalCoopCreated : config.totalCoopCreated - 1,
    ); // e.g., 0

    console.log('total coop created', totalCoopCreated);
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    // const coop_program = new PublicKey(
    //   '8EFH8uJyQFwcxUXAqhbLNSf6kNnANidbz4gPHa2QNrzW'
    // );

    // const base_seeds = [
    //   Buffer.from('mint'),
    //   creator.toBuffer(),
    //   seedBuffer,
    // ];

    // const result = await findVanityPDA(coop_program, base_seeds, 'c');

    // console.log('derived address', result.pda);
    // console.log('ending with', result.pda.toString());

    // const coopToken = new PublicKey(result.pda);

    const coopTokenNonce = 1;

    const nonceBytes = Buffer.alloc(8);
    nonceBytes.writeBigUInt64LE(BigInt(coopTokenNonce), 0);

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('mint'),
        creator.toBuffer(),
        seedBuffer,
        nonceBytes,
      ],
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

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId,
      );

    const metadataProgramId = new PublicKey(
      MPL_TOKEN_METADATA_PROGRAM_ID,
    );

    const [metadataPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
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
      true, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const traderTokenAta = await getAssociatedTokenAddress(
      coopToken,
      trader,
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const trader2TokenAta = await getAssociatedTokenAddress(
      coopToken,
      trader2,
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const [userTokenVotes] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('votes'), user.toBuffer(), coopToken.toBuffer()],
        program.programId,
      );

    const [user2TokenVotes] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('votes'),
          user2.toBuffer(),
          coopToken.toBuffer(),
        ],
        program.programId,
      );

    const userTokenAta = await getAssociatedTokenAddress(
      coopToken,
      user,
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const userToken2Ata = await getAssociatedTokenAddress(
      coopToken,
      user2,
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
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

  it.skip('Is initialized!', async () => {
    // Add your test here.

    const tx = await program.methods.initialize(teamWallet).rpc();
    console.log('Your transaction signature', tx);

    console.log(program.programId);

    const [configAda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('config')],
        program.programId,
      );

    const configState = await program.account.configData.fetch(
      configAda,
    );
    console.log('Config state data:', configState);

    assert.strictEqual(
      configState.admin.toString(),
      provider.wallet.publicKey.toString(),
    );
    assert.strictEqual(
      configState.teamWallet.toString(),
      teamWallet.toString(),
    );
    assert.strictEqual(configState.teamFee, 10);
    assert.strictEqual(configState.ownerFee, 10);
    assert.strictEqual(configState.affiliatedFee, 10);
    assert.strictEqual(configState.listingFee, 500);
    assert.strictEqual(configState.coopInterval.toNumber(), 600);
    assert.strictEqual(configState.fairlaunchPeriod, 300);
    // assert.strictEqual(configState.minPricePerToken, 100);
    // assert.strictEqual(configState.maxPricePerToken, 1000000000);
    assert.strictEqual(configState.totalCoopCreated, 0);
    assert.strictEqual(configState.totalCoopListed, 0);
  });

  it('updates the config', async () => {
    const { owner, configPda } = await setup(false);

    console.log(program.programId);

    const configState = await program.account.configData.fetch(
      configPda,
    );
    console.log('Config state data:', configState);

    const newTeamFee = new anchor.BN(10);
    const newOwnerFee = new anchor.BN(10);
    const newCoopInterval = new anchor.BN(300);
    const newFairlaunchPeriod = new anchor.BN(50);
    const newInitVirtualSol = new anchor.BN(5_000_000_000); // 2 SOL in lamports
    // const newInitVirtualToken = new anchor.BN('2000000000000000000'); // 2 billion tokens
    const newInitRealToken = new anchor.BN('1000000000000000000'); // 2 SOL in lamports

    const newMinVoteToken = new anchor.BN(1000_000_000_000);
    const newMinOptionToken = new anchor.BN(1000_000_000_000);
    const newFairlaunchCap = new anchor.BN(1_000_000_000);

    const newTeamWallet = new PublicKey(
      '3ntH2aAoCMDLR95iXmUahxdUtTEAvD9WHwxepSi9oAQM',
    );

    // const newMinPricePerToken = 1;

    await program.methods
      .updateConfig(
        newTeamFee,
        newOwnerFee,
        null,
        null,
        newTeamWallet,
        newCoopInterval,
        newFairlaunchPeriod,
        newInitVirtualSol,
        null,
        newInitRealToken,
        newFairlaunchCap,
        newMinVoteToken,
        newMinOptionToken,
      )
      .accounts({
        admin: owner,
        config: configPda,
      })
      .rpc();

    const config = await program.account.configData.fetch(configPda);

    console.log('Config state data:', config);

    assert.strictEqual(config.ownerFee, newOwnerFee.toNumber());
    assert.strictEqual(
      config.coopInterval.toNumber(),
      newCoopInterval.toNumber(),
    );
    // assert.strictEqual(
    //   config.initVirtualSol.toString(),
    //   newInitVirtualSol.toString()
    // );
    // assert.strictEqual(
    //   config.initVirtualToken.toString(),
    //   newInitVirtualToken.toString()
    // );
  });

  it.skip('updates the config storage', async () => {
    const { owner, configPda } = await setup(false);

    console.log(program.programId);

    // const configPda = new PublicKey(
    //   '5gpD3r3asr296Fok41Fu91ZVfNTpBwRpYBqtN4oTTruN'
    // );

    // const configState = await program.account.configData.fetch(
    //   configPda
    // );
    // console.log('Config state data:', configState);

    await program.methods
      .updateConfigStorage()
      .accounts({
        admin: owner,
        config: configPda,
      })
      .rpc();

    // const config = await program.account.configData.fetch(configPda);
    // console.log('Config state data:', config);
  });

  it.skip('provide roles', async () => {
    const owner = provider.wallet.publicKey;

    // const owner = creator.publicKey;
    // const owner = new PublicKey(
    //   '6D3YqGMtYHDYpVZNY8VeKrZRLPPYmDsLcZ5dKSUuarYP' // Mark
    // );
    // const owner = new PublicKey(
    //   'E3VZ1CWgXa4yULeYyFBYtvBPXfHurvn2DqEdTBvhDvcq' // Kenny
    // );

    // const owner = new PublicKey(
    //   'pFV11axxRCogW3nPGchmV6YbK4EpgQGFZrSyk1KZFEL' // Lovish
    // );

    // const owner = new PublicKey(
    //   'AAc5Ks2N4aqTPCyQqkmTyxZwKYLWBfrksNz5JErDSdnY' // Dennis 1
    // );

    // const owner = new PublicKey(
    //   'uabpfJPMqUdGZF6PoySKpNUx7tENy6Q9NpaeGeETrzd' // Dennis 2
    // );

    // const owner = new PublicKey(
    //   'CUjHyH9ebi4gpRsLvSB2VSnkc4gwgze3WqJr2Fwpv49S' // Ralph
    // );

    // CUjHyH9ebi4gpRsLvSB2VSnkc4gwgze3WqJr2Fwpv49S

    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );

    const creatorRoleType = {
      creating: {},
    };

    const votingRoleType = {
      voting: {},
    };

    const listingRoleType = {
      listing: {},
    };

    await program.methods
      .grantRole(creatorRoleType, owner)
      .accounts({
        admin: owner,
        rbac,
      })
      .rpc();

    await program.methods
      .grantRole(votingRoleType, owner)
      .accounts({
        admin: owner,
        rbac,
      })
      .rpc();

    await program.methods
      .grantRole(listingRoleType, owner)
      .accounts({
        admin: owner,
        rbac,
      })
      .rpc();

    const roleList = await program.account.rbaControlList.fetch(rbac);

    console.log('Config state data:', roleList);
  });

  it('Is creating memecoin!', async () => {
    await create_tokens();
  });

  it('first buying memecoin in fairlaunch!', async () => {
    await buy_tokens_fairlaunch(1, '500000000'); // 10 sol == 10000000000
    // await buy_tokens_fairlaunch(1, '5000000000'); // 10 sol == 10000000000
    // await buy_tokens_fairlaunch(1, '5000000000'); // 10 sol == 10000000000
  });

  it.skip('first selling memecoin in fairlaunch!', async () => {
    await sell_tokens_fairlaunch(1, '50000000'); // 5 sol
  });

  // it.skip('first voting with option with fairlaunch', async () => {
  //   await vote_with_option_fairlaunch('name', 'Token1');
  //   await vote_with_option_fairlaunch('sym', 'TKN1');
  //   await vote_with_option_fairlaunch('uri', 'uri1');
  // });

  // it.skip('first voting for fairlaunch', async () => {
  //   await vote_fairlaunch(1);
  //   await vote_fairlaunch(2);
  //   await vote_fairlaunch(3);
  // });

  // it.skip('first unvoting for fairlaunch', async () => {
  //   await unvote_fairlaunch(1);
  //   await unvote_fairlaunch(2);
  //   await unvote_fairlaunch(3);
  // });

  it.skip('multiple buy, sell', async () => {
    await buy_tokens_fairlaunch(1, '100000000'); // 10 sol
    await buy_tokens_fairlaunch(1, '200000000'); // 5 sol
    await buy_tokens_fairlaunch(1, '300000000'); // 3 sol
    await buy_tokens_fairlaunch(1, '400000000'); // 2 sol

    await sell_tokens_fairlaunch(1, '50000000'); // 5 sol
    await sell_tokens_fairlaunch(1, '50000000');
    await sell_tokens_fairlaunch(1, '50000000');
  });

  it('first buying memecoin!', async () => {
    console.log('Starting wait...');

    await delay(70 * 1000); // 2 minutes = 120000 ms

    console.log('3 minutes passed.');
    await buy_tokens('100000000'); // 10 SOL
    await buy_tokens('500000000'); // 10 SOL
    // await buy_tokens('500000000'); // 10 SOL
    // await buy_tokens('500000000'); // 10 SOL
    // await buy_tokens('4000000000'); // 10 SOL
    // await buy_tokens('4000000000'); // 10 SOL
    // await buy_tokens('10000000000'); // 10 SOL
    // await buy_tokens('15000000000'); // 10 SOL
    // await buy_tokens('30000000000'); // 10 SOL
    // await buy_tokens('50000000000'); // 10 SOL
    // await buy_tokens('100000000000'); // 10 SOL
  });

  it('refund sol and claim tokens after first buy in bonding-curve', async () => {
    await claim_and_refund(1);
  });

  // it('refund sol after first buy in bonding-curve', async () => {
  //   await refund();
  // });

  // it('claim tokens after first buy in bonding-curve', async () => {
  //   await claim();
  // });

  // it('first buying memecoin after fairlaunch passed!', async () => {
  //   await buy_tokens('100000000');
  // });

  it('first selling memecoin!', async () => {
    await sell_tokens(new BN('1000000000000'));
  });

  // it.skip('swap fairlaunch to bonding curve', async () => {
  //   await swap();
  // });

  it.skip('2 users buy but no one sell -> mcap is not reached -> both call claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '2000000000');
    await buy_tokens_fairlaunch(1, '3000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '2000000000');
    await buy_tokens_fairlaunch(2, '3000000000');

    console.log('Starting wait for fairlaunch to be over...');
    await delay(100 * 1000); // 2 minutes = 120000 ms
    console.log('Bonding curve started...');

    await buy_tokens('100000000'); // 10 SOL

    await claim_and_refund(1);
    await claim_and_refund(2);
    // await claim(1);
    // await claim(2);

    // await refund(1);
    // await refund(2);
  });

  it.skip('2 users buy but one sells -> mcap is not reached -> both call claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '2000000000');
    await buy_tokens_fairlaunch(1, '3000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '2000000000');
    await buy_tokens_fairlaunch(2, '3000000000');

    await sell_tokens_fairlaunch(1, '5400000000');

    console.log('Starting wait for fairlaunch to be over...');
    await delay(100 * 1000); // 2 minutes = 120000 ms
    console.log('Bonding curve started...');

    await buy_tokens('100000000'); // 10 SOL

    await claim_and_refund(1);
    await claim_and_refund(2);
    // await claim(1);
    // await claim(2);

    // await refund(1);
    // await refund(2);
  });

  it.skip('2 users buy but one sells -> mcap is reached -> both call claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '5000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '5000000000');
    await buy_tokens_fairlaunch(2, '9000000000');

    await sell_tokens_fairlaunch(1, '5400000000');

    console.log('Starting wait for fairlaunch to be over...');
    await delay(100 * 1000); // 2 minutes = 120000 ms
    console.log('Bonding curve started...');

    await buy_tokens('100000000'); // 10 SOL

    await claim_and_refund(1);
    await claim_and_refund(2);
    // await claim(1);
    // await claim(2);

    // await refund(1);
    // await refund(2);
  });

  it.skip('2 users buy but one sells all -> mcap is reached -> both call claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '5000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '10000000000');
    await buy_tokens_fairlaunch(2, '20000000000');

    await sell_tokens_fairlaunch(1, '13500000000');

    console.log('Starting wait for fairlaunch to be over...');
    await delay(100 * 1000); // 2 minutes = 120000 ms
    console.log('Bonding curve started...');

    await buy_tokens('100000000'); // 10 SOL

    // await claim(1);
    // await refund(1);

    // await claim_and_refund(1);
    await claim_and_refund(2);
    // await claim(2);

    // await refund(2);

    await unvote_all_tokens();
  });

  it.skip('2 users buy but no one sell -> greater than mcap reached -> both call claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '6000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '5000000000');
    await buy_tokens_fairlaunch(2, '5000000000');

    console.log('Starting wait for fairlaunch to be over...');
    await delay(100 * 1000); // 2 minutes = 120000 ms
    console.log('Bonding curve started...');

    await buy_tokens('100000000'); // 10 SOL

    await claim_and_refund(1);
    await claim_and_refund(2);
    // await claim(1);
    // await claim(2);

    // await refund(1);
    // await refund(2);
  });

  it('first voting with option', async () => {
    await vote_with_option('name', 'Coop');
    await vote_with_option('sym', 'COOP');
    await vote_with_option('uri', 'uri1');
    await vote_with_option('name', 'Coop2');
    await vote_with_option('sym', 'COOP2');
    await vote_with_option('uri', 'uri2');
  });

  it('first voting', async () => {
    await vote(1, 'Coop');
    await vote(2, 'COOP');
    await vote(3, 'uri1');
  });

  it('first unvoting', async () => {
    await unvote(1, 'Coop2');
    await unvote(2, 'COOP2');
    await unvote(3, 'uri2');
  });

  it.skip('multiple buy, sell, vote and unvote', async () => {
    await buy_tokens('100000000');
    await buy_tokens('100000000');
    // await buy_tokens('10000000000');
    // await buy_tokens('10000000000');
    // await buy_tokens('10000000000');

    await sell_tokens('1000000000000');
    await sell_tokens('1000000000000');
    await sell_tokens('1000000000000');
  });

  it.skip('emergency withdraw SOL', async () => {
    await emergencyWithdrawSol();
  });

  it.skip('emergency withdraw Coop token', async () => {
    await emergencyWithdrawCoopToken();
  });

  it('Is finalizing voting', async () => {
    console.log('Starting wait...');

    await delay(150 * 1000); // 2 minutes = 120000 ms

    console.log('3 minutes passed.');
    await finalizeVote('Coop', 'COOP', 'uri1');
  });

  it('Is listing memecoin!', async () => {
    await listToken();
  });

  it('unvoting all tokens', async () => {
    await unvote_all_tokens();
  });

  it.skip('unfreeze all tokens', async () => {
    await unfreeze_multiple_users();
  });

  it('Is swapping SOL to memecoin!', async () => {
    const {
      user,
      owner,
      rbac,
      creator,
      configPda,
      globalVault,
      globalTokenAta,
      coopToken,
      memecoinPda,
    } = await setup(false);
    const payer = provider.wallet.publicKey;

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
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false,
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram,
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram, // this is NOT your current program ID
    );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram, // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram,
      );

    const txSig = await program.methods
      .swapTokenBaseInput(new BN(100000000), new BN(0))
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
      configPda,
    );
    console.log('Config state data:', configState);
  });

  it('Is swapping memecoin to SOL!', async () => {
    const {
      user,
      owner,
      rbac,
      creator,
      configPda,
      globalVault,
      globalTokenAta,
      coopToken,
      memecoinPda,
    } = await setup(false);
    const payer = provider.wallet.publicKey;

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
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false,
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram,
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram, // this is NOT your current program ID
    );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram, // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram,
      );

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(ownerToken1);

    const txSig = await program.methods
      .swapTokenBaseOutput(
        new BN(userTokenBal.value.amount),
        new BN(1_00_00_00),
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
      configPda,
    );
    console.log('Config state data:', configState);
  });

  // it.skip('Is burn memecoin!', async () => {
  //   const owner = provider.wallet.publicKey;
  //   const creator = provider.wallet.publicKey;

  //   const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from('config')],
  //     program.programId
  //   );

  //   // Fetch the config to get `total_coop_created`
  //   const config = await program.account.configData.fetch(configPda);

  //   const [globalVault] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [Buffer.from('global')],
  //       program.programId
  //     );

  //   console.log('global vault', globalVault);

  //   const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
  //   const seedBuffer = totalCoopCreated
  //     .addn(1)
  //     .toArrayLike(Buffer, 'le', 4); // u64 LE

  //   const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
  //     program.programId
  //   );

  //   const [memecoinPda] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [Buffer.from('memecoin'), coopToken.toBuffer()],
  //       program.programId
  //     );
  //   const memecoinData = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );

  //   console.log(
  //     'real token reserves',
  //     memecoinData.realTokenReserves.toString()
  //   );

  //   // const globalWsolAccount = await getAssociatedTokenAddress(
  //   //   NATIVE_MINT,
  //   //   globalVault,
  //   //   true
  //   // );

  //   // const sig = await program.provider.sendAndConfirm(
  //   //   new Transaction().add(
  //   //     SystemProgram.transfer({
  //   //       fromPubkey: program.provider.publicKey,
  //   //       toPubkey: ownerWsolAccount,
  //   //       lamports: 100000000,
  //   //     })
  //   //   )
  //   // );

  //   const [globalTokenAta] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         globalVault.toBuffer(),
  //         anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
  //         coopToken.toBuffer(),
  //       ],
  //       anchor.utils.token.ASSOCIATED_PROGRAM_ID
  //     );

  //   console.log('global token ata', globalTokenAta);

  //   const token0Mint =
  //     Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
  //       ? coopToken
  //       : NATIVE_MINT;
  //   const token1Mint =
  //     Buffer.compare(coopToken.toBuffer(), NATIVE_MINT.toBuffer()) < 0
  //       ? NATIVE_MINT
  //       : coopToken;

  //   const ownerToken0 = await getAssociatedTokenAddress(
  //     token0Mint,
  //     owner,
  //     false // allowOwnerOffCurve = false (always false unless you know it's needed)
  //   );

  //   const ownerToken1 = await getAssociatedTokenAddress(
  //     token1Mint,
  //     owner,
  //     false
  //   );
  //   const [poolState] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('pool'),
  //       ammConfig.toBuffer(),
  //       token0Mint.toBuffer(),
  //       token1Mint.toBuffer(),
  //     ],
  //     cpSwapProgram
  //   );
  //   console.log(ownerToken0, ownerToken1);
  //   const [lpMint] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from('pool_lp_mint'), // same string as in Rust
  //       poolState.toBuffer(), // pool_state.key()
  //     ],
  //     cpSwapProgram // this is NOT your current program ID
  //   );

  //   // const ownerLpToken = await getAssociatedTokenAddress(
  //   //   lpMint,
  //   //   owner,
  //   //   false // allowOwnerOffCurve — if needed
  //   // );

  //   const [ownerLpToken] = await PublicKey.findProgramAddress(
  //     [
  //       creator.toBuffer(),
  //       anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
  //       lpMint.toBuffer(),
  //     ],
  //     anchor.utils.token.ASSOCIATED_PROGRAM_ID
  //   );

  //   const [token0Vault] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('pool_vault'),
  //         poolState.toBuffer(),
  //         token0Mint.toBuffer(),
  //       ],
  //       cpSwapProgram
  //     );

  //   const [token1Vault] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('pool_vault'),
  //         poolState.toBuffer(),
  //         token1Mint.toBuffer(),
  //       ],
  //       cpSwapProgram
  //     );

  //   const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from('vault_and_lp_mint_auth_seed')],
  //     cpSwapProgram // This should be the ID of the cp-swap program
  //   );

  //   console.log('authority pda', authority);

  //   const [observationState] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [Buffer.from('observation'), poolState.toBuffer()],
  //       cpSwapProgram
  //     );

  //   const txSig = await program.methods
  //     .burnLpToken()
  //     .accounts({
  //       owner, // fine
  //       creator, // fine
  //       config: configPda, // fine
  //       token0Mint,
  //       token1Mint,
  //       coopToken, // fine
  //       memecoin: memecoinPda, // fine
  //       lpMint,
  //       ownerLpToken,
  //       cpSwapProgram, // fine
  //       ammConfig, // fine
  //       poolState, // fine
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       associatedTokenProgram:
  //         anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //     })
  //     .preInstructions([
  //       ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
  //     ])
  //     .rpc();

  //   console.log('Tx hash:', txSig);
  //   const tx = await provider.connection.getTransaction(txSig, {
  //     commitment: 'confirmed',
  //     maxSupportedTransactionVersion: 0,
  //   });
  //   if (!tx || !tx.meta) {
  //     console.error('Transaction or metadata not found');
  //   } else {
  //     console.log(tx.meta.logMessages);
  //   }
  //   const memecoinState = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );
  //   console.log(
  //     'Memecoin state data:',
  //     memecoinState.tokenMarketEndTime.toString()
  //   );

  //   const configState = await program.account.configData.fetch(
  //     configPda
  //   );
  //   console.log('Config state data:', configState);
  // });

  async function create_tokens() {
    const {
      creator,
      configPda,
      rbac,
      globalVault,
      coopToken,
      // fairlaunchToken,
      memecoinPda,
      metadataPda,
      // fairlaunchMetadataPda,
      // globalFairlaunchTokenAta,
      globalTokenAta,
      voteTokenAta,
      voteOptionsRegistry,
      coopTokenNonce,
      // voteFairlaunchTokenAta,
    } = await setup(true);

    // Fetch the config to get `total_coop_created`
    let config = await program.account.configData.fetch(configPda);

    const totalCoopCreated = new BN(config.totalCoopCreated); // e.g., 0

    await program.methods
      .unpause()
      .accounts({
        admin: creator,
        config: configPda,
      })
      .rpc();

    config = await program.account.configData.fetch(configPda);
    console.log('Config state -> is paused:', config.isPaused);

    const setComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    });

    const txSig = await program.methods
      .createToken(
        new BN(coopTokenNonce),
        new BN('1000000000000000000'),
        // new BN('30'),
        'Token Thursday 3',
        'FLW',
        'uri',
      )
      .accounts({
        creator,
        config: configPda,
        rbac,
        globalVault,
        coopToken,
        // fairlaunchToken,
        memecoin: memecoinPda,
        tokenMetadataAccount: metadataPda,
        // tokenVotes: tokenVotesPda,
        globalTokenAta,
        // tokenFairlaunchMetadataAccount: fairlaunchMetadataPda,
        // globalFairlaunchTokenAta,
        voteTokenAta,
        voteOptionsRegistry,
        // voteFairlaunchTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Update if needed
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([setComputeUnits])
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
      memecoinPda,
    );
    console.log('Memecoin state data:', memecoinState);
    const configState = await program.account.configData.fetch(
      configPda,
    );

    assert.strictEqual(
      configState.totalCoopCreated,
      totalCoopCreated.add(new BN(1)).toNumber(),
    );
    assert.strictEqual(
      memecoinState.tokenId,
      totalCoopCreated.add(new BN(1)).toNumber(),
    );
    assert.strictEqual(
      memecoinState.tokenMint.toString(),
      coopToken.toString(),
    );
    assert.strictEqual(
      memecoinState.creator.toString(),
      creator.toString(),
    );
    assert.strictEqual(
      memecoinState.tokenTotalSupply.toString(),
      new BN('1000000000000000000').toString(),
    );
    assert.strictEqual(memecoinState.isTradingActive, true);
    assert.strictEqual(memecoinState.isBondingCurveActive, false);
    assert.strictEqual(memecoinState.isTokenListed, false);
  }

  async function buy_tokens_fairlaunch(keypair, sol_amount) {
    const {
      trader,
      trader2Keypair,
      trader2,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      globalTokenAta,
      userData,
      user2Data,
    } = await setup(false);

    let finalTrader = trader;
    let finalUserData = userData;
    let signers = [];

    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      signers.push(trader2Keypair);
    }

    const txSig = await program.methods
      .buyTokensFairlaunch(new BN(sol_amount))
      .accounts({
        trader: finalTrader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        userData: finalUserData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers(signers) // keypair here
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
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    console.log(
      'Memecoin state data: buy cap',
      memecoinState.bondingCurveBuyCap.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );

    console.log(
      'User  state data: ' +
        keypair.toString() +
        ' totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User  state data: ' + keypair.toString() + ' claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User  state data: ' + keypair.toString() + ' claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function refund(keypair) {
    const {
      trader,
      trader2,
      trader2Keypair,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      globalTokenAta,
      traderTokenAta,
      trader2TokenAta,
      userData,
      user2Data,
    } = await setup(false);

    let finalTrader = trader;
    let finalUserData = userData;
    let finalTraderTokenAta = traderTokenAta;
    let signers = [];

    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      finalTraderTokenAta = trader2TokenAta;
      signers.push(trader2Keypair);
    }

    let userSolBalancebeforeRefund =
      await provider.connection.getBalance(finalTrader);
    console.log(
      'user sol balance before refund',
      userSolBalancebeforeRefund.toString(),
    );
    const txSig = await program.methods
      .refundSol()
      .accounts({
        trader: finalTrader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        userData: finalUserData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers(signers)
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

    let userSolBalanceAfterRefund =
      await provider.connection.getBalance(finalTrader);
    console.log(
      'user sol balance after refund',
      userSolBalanceAfterRefund.toString(),
    );

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function buy_tokens(sol_amount) {
    const {
      trader,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userData,
      globalTokenAta,
      traderTokenAta,
    } = await setup(false);

    const txSig = await program.methods
      .buyTokensBondingcurve(new BN(sol_amount), new BN(0))
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
        userData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
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

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(
        traderTokenAta,
      );

    console.log(
      'user balance after buying in bonding curve',
      userTokenBal,
    );

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    console.log(
      'Memecoin state data: buy cap',
      memecoinState.bondingCurveBuyCap.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      userData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function sell_tokens_fairlaunch(keypair, sol_amount) {
    const {
      trader,
      trader2,
      trader2Keypair,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      globalTokenAta,
      userData,
      user2Data,
    } = await setup(false);

    let finalTrader = trader;
    let finalUserData = userData;
    let signers = [];

    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      signers.push(trader2Keypair);
    }

    const txSig = await program.methods
      .sellTokensFairlaunch(new BN(sol_amount))
      .accounts({
        trader: finalTrader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        userData: finalUserData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );
    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function sell_tokens(token_amount) {
    const {
      trader,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userData,
      globalTokenAta,
      traderTokenAta,
    } = await setup(false);
    const txSig = await program.methods
      .sellTokensBondingcurve(new BN(token_amount), new BN(0))
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
        userData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(
        traderTokenAta,
      );

    console.log(
      'user balance after selling in bonding curve',
      userTokenBal,
    );

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      userData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function claim(keypair) {
    const {
      trader,
      trader2,
      trader2Keypair,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userData,
      user2Data,
      globalTokenAta,
      traderTokenAta,
      trader2TokenAta,
    } = await setup(false);

    let finalTrader = trader;
    let finalUserData = userData;
    let finalTraderTokenAta = traderTokenAta;
    let signers = [];

    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      finalTraderTokenAta = trader2TokenAta;
      signers.push(trader2Keypair);
    }

    let userTokenBal;

    // let userTokenBal =
    //   await provider.connection.getTokenAccountBalance(
    //     finalTraderTokenAta
    //   );

    // console.log(
    //   'user balance before claim',
    //   userTokenBal.value.uiAmountString
    // );

    const txSig = await program.methods
      .claimTokens()
      .accounts({
        trader: finalTrader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        traderTokenAta: finalTraderTokenAta,
        userData: finalUserData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers(signers)
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      finalTraderTokenAta,
    );

    console.log(
      'user balance after claim',
      userTokenBal.value.uiAmountString,
    );

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function claim_and_refund(keypair) {
    const {
      trader,
      trader2,
      trader2Keypair,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userData,
      user2Data,
      globalTokenAta,
      traderTokenAta,
      trader2TokenAta,
    } = await setup(false);

    let finalTrader = trader;
    let finalUserData = userData;
    let finalTraderTokenAta = traderTokenAta;
    let signers = [];

    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      finalTraderTokenAta = trader2TokenAta;
      signers.push(trader2Keypair);
    }

    let userTokenBal;

    //   =
    //   await provider.connection.getTokenAccountBalance(
    //     finalTraderTokenAta
    //   );

    // console.log(
    //   'user balance before claim',
    //   userTokenBal.value.uiAmountString
    // );

    let userSolBalancebeforeRefund =
      await provider.connection.getBalance(finalTrader);
    console.log(
      'user sol balance before refund',
      userSolBalancebeforeRefund.toString(),
    );

    const txSig = await program.methods
      .claimTokensAndRefundSol()
      .accounts({
        trader: finalTrader,
        affiliate,
        creator,
        teamWallet,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        traderTokenAta: finalTraderTokenAta,
        userData: finalUserData,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers(signers) // keypair here
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      finalTraderTokenAta,
    );

    console.log(
      'user balance after claim',
      userTokenBal.value.uiAmountString,
    );

    let userSolBalanceAfterRefund =
      await provider.connection.getBalance(finalTrader);
    console.log(
      'user sol balance after refund',
      userSolBalanceAfterRefund.toString(),
    );

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );

    console.log(
      'User  state data: ' +
        keypair.toString() +
        ' totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User  state data: ' + keypair.toString() + ' claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User  state data: ' + keypair.toString() + ' claimed refund?',
      userDataState.refund.toString(),
    );
  }

  // async function vote_fairlaunch(option_index) {
  //   const {
  //     user,
  //     creator,
  //     configPda,
  //     globalVault,
  //     coopToken,
  //     fairlaunchToken,
  //     memecoinPda,
  //     userFairlaunchTokenAta,
  //     voteFairlaunchTokenAta,
  //     userTokenVotes,
  //   } = await setup(false);

  //   const totalOptionIndex = new BN(Number(option_index)); // e.g., 0
  //   const optionSeedBuffer = totalOptionIndex.toArrayLike(
  //     Buffer,
  //     'le',
  //     4
  //   ); // u64 LE

  //   const [tokenOption] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         coopToken.toBuffer(),
  //         optionSeedBuffer,
  //       ],
  //       program.programId
  //     );

  //   const tokenOptionData = await program.account.tokenOption.fetch(
  //     tokenOption
  //   );

  //   console.log('tokenOptionData', tokenOptionData);

  //   const [userTokenOptionVotes] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         user.toBuffer(),
  //         tokenOption.toBuffer(),
  //       ],
  //       program.programId
  //     );

  //   let userTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       userFairlaunchTokenAta
  //     );

  //   console.log('user balance before voting', userTokenBal);

  //   const txSig = await program.methods
  //     .voteFairlaunch(new BN(1000000000000))
  //     .accounts({
  //       user,
  //       creator,
  //       config: configPda,
  //       globalVault,
  //       coopToken: fairlaunchToken,
  //       memecoin: memecoinPda,
  //       tokenOption,
  //       userTokenVotes,
  //       userTokenOptionVotes,
  //       userTokenAta: userFairlaunchTokenAta,
  //       voteTokenAta: voteFairlaunchTokenAta,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       associatedTokenProgram:
  //         anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();

  //   console.log('Tx hash:', txSig);
  //   const tx = await provider.connection.getTransaction(txSig, {
  //     commitment: 'confirmed',
  //     maxSupportedTransactionVersion: 0,
  //   });
  //   if (!tx || !tx.meta) {
  //     console.error('Transaction or metadata not found');
  //   } else {
  //     console.log(tx.meta.logMessages);
  //   }

  //   userTokenBal = await provider.connection.getTokenAccountBalance(
  //     userFairlaunchTokenAta
  //   );

  //   console.log('user balance after voting', userTokenBal);

  //   let voteTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       voteFairlaunchTokenAta
  //     );

  //   console.log('vote token pda balance after voting', voteTokenBal);

  //   const memecoinState = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );
  //   console.log('Memecoin state data:', memecoinState);

  //   const userVotesState = await program.account.userTokenVotes.fetch(
  //     userTokenVotes
  //   );
  //   console.log('user tokens vote state data:', userVotesState);
  // }

  async function vote(option_index, option_value) {
    const {
      user,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userTokenAta,
      voteTokenAta,
      userTokenVotes,
    } = await setup(false);

    const totalOptionIndex = new BN(Number(option_index)); // e.g., 0
    const optionSeedBuffer = totalOptionIndex.toArrayLike(
      Buffer,
      'le',
      4,
    ); // u64 LE

    let hashed_option_value = sha256(option_value);

    // const optionValueBuffer = Buffer.from(sha256(option_value)); // e.g., "my_option_value"

    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
          // optionSeedBuffer,
        ],
        program.programId,
      );

    const tokenOptionData = await program.account.tokenOption.fetch(
      tokenOption,
    );

    console.log('tokenOptionData', tokenOptionData);

    const [userTokenOptionVotes] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          user.toBuffer(),
          tokenOption.toBuffer(),
        ],
        program.programId,
      );

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(userTokenAta);

    console.log('user balance before voting', userTokenBal);

    const txSig = await program.methods
      .vote(new BN(1000000000000))
      .accounts({
        user,
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        tokenOption,
        userTokenVotes,
        userTokenOptionVotes,
        userTokenAta,
        voteTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );

    console.log('user balance after voting', userTokenBal);

    let voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);

    console.log('vote token pda balance after voting', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user tokens vote state data:', userVotesState);
  }

  // async function vote_with_option_fairlaunch(
  //   option_type,
  //   option_value
  // ) {
  //   const {
  //     user,
  //     creator,
  //     configPda,
  //     globalVault,
  //     coopToken,
  //     fairlaunchToken,
  //     memecoinPda,
  //     userFairlaunchTokenAta,
  //     voteFairlaunchTokenAta,
  //     userTokenVotes,
  //   } = await setup(false);

  //   // Fetch the config to get `total_coop_created`
  //   const config = await program.account.configData.fetch(configPda);

  //   const memecoinData = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );

  //   const totalOptions = new BN(memecoinData.totalOptions); // e.g., 0
  //   const optionSeedBuffer = totalOptions
  //     .addn(1)
  //     .toArrayLike(Buffer, 'le', 4); // u64 LE

  //   const [tokenOption] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         coopToken.toBuffer(),
  //         optionSeedBuffer,
  //       ],
  //       program.programId
  //     );

  //   const [userTokenOptionVotes] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         user.toBuffer(),
  //         tokenOption.toBuffer(),
  //       ],
  //       program.programId
  //     );

  //   let userTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       userFairlaunchTokenAta
  //     );

  //   console.log('user balance before voting', userTokenBal);

  //   let optionType;
  //   if (option_type == 'name') {
  //     optionType = { name: {} };
  //   } else if (option_type == 'sym') {
  //     optionType = { sym: {} };
  //   } else if (option_type == 'uri') {
  //     optionType = { uri: {} };
  //   }
  //   const createOption = {
  //     optionType,
  //     optionValue: option_value,
  //     votes: new BN('1000000000000'),
  //   };

  //   const txSig = await program.methods
  //     .voteWithOptionFairlaunch(createOption)
  //     .accounts({
  //       user,
  //       creator,
  //       config: configPda,
  //       globalVault,
  //       coopToken: fairlaunchToken,
  //       memecoin: memecoinPda,
  //       tokenOption,
  //       userTokenVotes,
  //       userTokenOptionVotes,
  //       userTokenAta: userFairlaunchTokenAta,
  //       voteTokenAta: voteFairlaunchTokenAta,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       associatedTokenProgram:
  //         anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();

  //   console.log('Tx hash:', txSig);
  //   const tx = await provider.connection.getTransaction(txSig, {
  //     commitment: 'confirmed',
  //     maxSupportedTransactionVersion: 0,
  //   });
  //   if (!tx || !tx.meta) {
  //     console.error('Transaction or metadata not found');
  //   } else {
  //     console.log(tx.meta.logMessages);
  //   }

  //   userTokenBal = await provider.connection.getTokenAccountBalance(
  //     userFairlaunchTokenAta
  //   );

  //   console.log('user balance after voting', userTokenBal);

  //   // const tokenVotesState = await program.account.tokenVotes.fetch(
  //   //   tokenVotesPda
  //   // );
  //   // console.log('token votes state data:', tokenVotesState);

  //   let voteTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       voteFairlaunchTokenAta
  //     );

  //   console.log('vote token pda balance after voting', voteTokenBal);

  //   const memecoinState = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );
  //   console.log('Memecoin state data:', memecoinState);

  //   const userVotesState = await program.account.userTokenVotes.fetch(
  //     userTokenVotes
  //   );
  //   console.log('user tokens vote state data:', userVotesState);
  // }

  async function vote_with_option(option_type, option_value) {
    const {
      user,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userTokenAta,
      voteTokenAta,
      userTokenVotes,
      voteOptionsRegistry,
    } = await setup(false);

    const memecoinData = await program.account.memeCoinData.fetch(
      memecoinPda,
    );

    const totalOptions = new BN(memecoinData.totalOptions); // e.g., 0
    const optionSeedBuffer = totalOptions
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    let hashed_option_value = sha256(option_value);
    const optionValueBuffer = Buffer.from(hashed_option_value); // e.g., "my_option_value"
    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
          // optionSeedBuffer,
        ],
        program.programId,
      );

    const [userTokenOptionVotes] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          user.toBuffer(),
          tokenOption.toBuffer(),
        ],
        program.programId,
      );

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(userTokenAta);

    console.log('user balance before voting', userTokenBal);

    let optionType;
    if (option_type == 'name') {
      optionType = { name: {} };
    } else if (option_type == 'sym') {
      optionType = { sym: {} };
    } else if (option_type == 'uri') {
      optionType = { uri: {} };
    }
    const createOption = {
      optionType,
      optionValue: option_value,
      votes: new BN('1000000000000'),
    };

    let voteOptionsList = await program.account.optionsRegistry.fetch(
      voteOptionsRegistry,
    );

    const currentLen = voteOptionsList.tokenRegistry.length;
    console.log('current option list length', currentLen.toString());

    let newLen = 0;
    if (currentLen != 0 && currentLen % 3 == 0) {
      newLen = currentLen + 3;
    }
    const txSig = await program.methods
      .voteWithOption(
        new Uint8Array(hashed_option_value),
        // new BN(newLen),
        createOption,
      )
      .accounts({
        user,
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        tokenOption,
        userTokenVotes,
        userTokenOptionVotes,
        userTokenAta,
        voteTokenAta,
        voteOptionsRegistry,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );

    console.log('user balance after voting', userTokenBal);

    let voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);

    console.log('vote token pda balance after voting', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user tokens vote state data:', userVotesState);

    voteOptionsList = await program.account.optionsRegistry.fetch(
      voteOptionsRegistry,
    );
    console.log(
      'vote options list',
      voteOptionsList.tokenRegistry.toString(),
    );
  }

  // async function unvote_fairlaunch(option_index) {
  //   const {
  //     user,
  //     creator,
  //     configPda,
  //     globalVault,
  //     coopToken,
  //     fairlaunchToken,
  //     memecoinPda,
  //     userFairlaunchTokenAta,
  //     voteFairlaunchTokenAta,
  //     userTokenVotes,
  //   } = await setup(false);

  //   // const user = provider.wallet.publicKey;

  //   // const creator = provider.wallet.publicKey;

  //   // const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
  //   //   [Buffer.from('config')],
  //   //   program.programId
  //   // );

  //   // // Fetch the config to get `total_coop_created`
  //   // const config = await program.account.configData.fetch(configPda);

  //   // const [globalVault] =
  //   //   anchor.web3.PublicKey.findProgramAddressSync(
  //   //     [Buffer.from('global')],
  //   //     program.programId
  //   //   );

  //   // console.log('global vault', globalVault);

  //   // const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
  //   // const seedBuffer = totalCoopCreated
  //   //   .addn(1)
  //   //   .toArrayLike(Buffer, 'le', 4); // u64 LE

  //   // const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
  //   //   [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
  //   //   program.programId
  //   // );

  //   // const [fairlaunchToken] =
  //   //   anchor.web3.PublicKey.findProgramAddressSync(
  //   //     [Buffer.from('mint'), coopToken.toBuffer(), seedBuffer],
  //   //     program.programId
  //   //   );

  //   // const [memecoinPda] =
  //   //   anchor.web3.PublicKey.findProgramAddressSync(
  //   //     [Buffer.from('memecoin'), coopToken.toBuffer()],
  //   //     program.programId
  //   //   );
  //   // const memecoinData = await program.account.memeCoinData.fetch(
  //   //   memecoinPda
  //   // );

  //   const totalOptionIndex = new BN(Number(option_index)); // e.g., 0
  //   const optionSeedBuffer = totalOptionIndex.toArrayLike(
  //     Buffer,
  //     'le',
  //     4
  //   ); // u64 LE

  //   const [tokenOption] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         coopToken.toBuffer(),
  //         optionSeedBuffer,
  //       ],
  //       program.programId
  //     );

  //   const tokenOptionData = await program.account.tokenOption.fetch(
  //     tokenOption
  //   );

  //   console.log('tokenOptionData', tokenOptionData);

  //   const [userTokenOptionVotes] =
  //     anchor.web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from('option'),
  //         user.toBuffer(),
  //         tokenOption.toBuffer(),
  //       ],
  //       program.programId
  //     );

  //   // const [userTokenVotes] =
  //   //   anchor.web3.PublicKey.findProgramAddressSync(
  //   //     [Buffer.from('votes'), user.toBuffer(), coopToken.toBuffer()],
  //   //     program.programId
  //   //   );

  //   // const userTokenAta = await getAssociatedTokenAddress(
  //   //   fairlaunchToken,
  //   //   user,
  //   //   false // allowOwnerOffCurve = false (always false unless you know it's needed)
  //   // );

  //   // const voteTokenAta = await getAssociatedTokenAddress(
  //   //   fairlaunchToken,
  //   //   memecoinPda,
  //   //   true // allowOwnerOffCurve = false (always false unless you know it's needed)
  //   // );

  //   let userTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       userFairlaunchTokenAta
  //     );

  //   console.log('user balance before voting', userTokenBal);

  //   const txSig = await program.methods
  //     .unvoteFairlaunch(new BN(1000000000000))
  //     .accounts({
  //       user,
  //       creator,
  //       config: configPda,
  //       globalVault,
  //       coopToken: fairlaunchToken,
  //       memecoin: memecoinPda,
  //       tokenOption,
  //       userTokenVotes,
  //       userTokenOptionVotes,
  //       userTokenAta: userFairlaunchTokenAta,
  //       voteTokenAta: voteFairlaunchTokenAta,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       associatedTokenProgram:
  //         anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();

  //   console.log('Tx hash:', txSig);
  //   const tx = await provider.connection.getTransaction(txSig, {
  //     commitment: 'confirmed',
  //     maxSupportedTransactionVersion: 0,
  //   });
  //   if (!tx || !tx.meta) {
  //     console.error('Transaction or metadata not found');
  //   } else {
  //     console.log(tx.meta.logMessages);
  //   }

  //   userTokenBal = await provider.connection.getTokenAccountBalance(
  //     userFairlaunchTokenAta
  //   );

  //   console.log('user balance after voting', userTokenBal);

  //   let voteTokenBal =
  //     await provider.connection.getTokenAccountBalance(
  //       voteFairlaunchTokenAta
  //     );

  //   console.log('vote token pda balance after voting', voteTokenBal);

  //   const memecoinState = await program.account.memeCoinData.fetch(
  //     memecoinPda
  //   );
  //   console.log('Memecoin state data:', memecoinState);

  //   const userVotesState = await program.account.userTokenVotes.fetch(
  //     userTokenVotes
  //   );
  //   console.log('user tokens vote state data:', userVotesState);
  // }

  async function unvote(option_index, option_value) {
    const {
      user,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userTokenAta,
      voteTokenAta,
      userTokenVotes,
    } = await setup(false);

    const totalOptionIndex = new BN(Number(option_index)); // e.g., 0
    const optionSeedBuffer = totalOptionIndex.toArrayLike(
      Buffer,
      'le',
      4,
    ); // u64 LE

    let hashed_option_value = sha256(option_value);

    const optionValueBuffer = Buffer.from(hashed_option_value); // e.g., "my_option_value"

    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
          // optionSeedBuffer,
        ],
        program.programId,
      );

    const tokenOptionData = await program.account.tokenOption.fetch(
      tokenOption,
    );

    console.log('tokenOptionData', tokenOptionData);

    const [userTokenOptionVotes] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          user.toBuffer(),
          tokenOption.toBuffer(),
        ],
        program.programId,
      );

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(userTokenAta);

    console.log('user balance before voting', userTokenBal);

    const txSig = await program.methods
      .unvote(new BN(1000000000000))
      .accounts({
        user,
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        tokenOption,
        userTokenVotes,
        userTokenOptionVotes,
        userTokenAta,
        voteTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );

    console.log('user balance after voting', userTokenBal);

    let voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);

    console.log('vote token pda balance after voting', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user tokens vote state data:', userVotesState);
  }

  // async function swap() {
  //   const {
  //     user,
  //     creator,
  //     configPda,
  //     globalVault,
  //     coopToken,
  //     fairlaunchToken,
  //     memecoinPda,
  //     globalTokenAta,
  //     globalFairlaunchTokenAta,
  //     userTokenAta,
  //     userFairlaunchTokenAta,
  //   } = await setup(false);

  //   const txSig = await program.methods
  //     .swap()
  //     .accounts({
  //       user,
  //       creator,
  //       config: configPda,
  //       globalVault,
  //       coopToken,
  //       fairlaunchToken,
  //       memecoin: memecoinPda,
  //       globalTokenAta,
  //       globalFairlaunchTokenAta,
  //       userTokenAta,
  //       userFairlaunchTokenAta,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       // associatedTokenProgram:
  //       //   anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();

  //   console.log('Tx hash:', txSig);
  //   const tx = await provider.connection.getTransaction(txSig, {
  //     commitment: 'confirmed',
  //     maxSupportedTransactionVersion: 0,
  //   });
  //   if (!tx || !tx.meta) {
  //     console.error('Transaction or metadata not found');
  //   } else {
  //     console.log(tx.meta.logMessages);
  //   }
  // }

  async function finalizeVote(name_value, symbol_value, uri_value) {
    const {
      user,
      rbac,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
    } = await setup(false);

    const memecoinData = await program.account.memeCoinData.fetch(
      memecoinPda,
    );

    console.log('Memecoin state data:', memecoinData);
    let hashed_name_value = sha256(name_value);
    let hashed_symbol_value = sha256(symbol_value);
    let hashed_uri_value = sha256(uri_value);

    const [nameTokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_name_value,
          // nameOptionSeedBuffer,
        ],
        program.programId,
      );

    const [symbolTokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_symbol_value,
          // symbolOptionSeedBuffer,
        ],
        program.programId,
      );

    const [uriTokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_uri_value,
          // uriOptionSeedBuffer,
        ],
        program.programId,
      );

    const metadataProgramId = new PublicKey(
      MPL_TOKEN_METADATA_PROGRAM_ID,
    );

    const [metadataPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          metadataProgramId.toBuffer(),
          coopToken.toBuffer(),
        ],
        metadataProgramId,
      );

    const txSig = await program.methods
      .finalizeVote('final_uri')
      .accounts({
        user,
        creator,
        config: configPda,
        rbac,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        nameOption: nameTokenOption,
        symbolOption: symbolTokenOption,
        uriOption: uriTokenOption,
        tokenMetadataAccount: metadataPda,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Update if needed
        ),
      })
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
  }

  async function listToken() {
    const {
      user,
      owner,
      rbac,
      creator,
      configPda,
      globalVault,
      globalTokenAta,
      coopToken,
      memecoinPda,
    } = await setup(false);

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
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      owner,
      false,
    );
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram,
    );
    console.log(ownerToken0, ownerToken1);
    const [lpMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool_lp_mint'), // same string as in Rust
        poolState.toBuffer(), // pool_state.key()
      ],
      cpSwapProgram, // this is NOT your current program ID
    );

    const [ownerLpToken] = await PublicKey.findProgramAddress(
      [
        creator.toBuffer(),
        anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
        lpMint.toBuffer(),
      ],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    );

    const [token0Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token0Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [token1Vault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool_vault'),
          poolState.toBuffer(),
          token1Mint.toBuffer(),
        ],
        cpSwapProgram,
      );

    const [authority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      cpSwapProgram, // This should be the ID of the cp-swap program
    );

    console.log('authority pda', authority);

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram,
      );

    const txSig = await program.methods
      .listToken()
      .accounts({
        owner, // fine
        creator, // fine
        teamWallet, // fine
        config: configPda, // fine
        rbac,
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
      memecoinPda,
    );
    console.log(
      'Memecoin state data:',
      memecoinState.tokenMarketEndTime.toString(),
    );

    const configState = await program.account.configData.fetch(
      configPda,
    );
    console.log('Config state data:', configState);
  }

  async function unvote_all_tokens() {
    const {
      user,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      globalTokenAta,
      userTokenVotes,
      userTokenAta,
      userData,
      voteTokenAta,
    } = await setup(false);

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(userTokenAta);

    console.log('user balance before voting', userTokenBal);

    const txSig = await program.methods
      .unvoteAllTokens()
      .accounts({
        user,
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        userTokenVotes,
        userTokenAta,
        userData,
        voteTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );

    console.log('user balance after voting', userTokenBal);

    let voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);

    console.log('vote token pda balance after voting', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user tokens vote state data:', userVotesState);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin state data: virtual sol reserves',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: virtual token reserves',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'Memecoin state data: real sol reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: real token reserves',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'Memecoin state data: fairlaunch token reserves',
      memecoinState.fairlaunchTokenReserves.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch sol raised',
      memecoinState.fairlaunchSolRaised.toString(),
    );

    console.log(
      'Memecoin state data: fairlaunch cap',
      memecoinState.fairlaunchCap.toString(),
    );

    console.log(
      'Memecoin state data: total votes',
      memecoinState.totalVotes.toString(),
    );

    console.log(
      'Memecoin state data: total options',
      memecoinState.totalOptions.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      userData,
    );

    console.log(
      'User state data: totat sol deposit',
      userDataState.solDeposit.toString(),
    );

    console.log(
      'User state data: claimed tokens?',
      userDataState.tokensClaimed.toString(),
    );

    console.log(
      'User state data: claimed refund?',
      userDataState.refund.toString(),
    );
  }

  async function unfreeze_multiple_users() {
    const {
      user,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      userTokenAta,
    } = await setup(false);

    const txSig = await program.methods
      .unfreezeMultipleAccounts()
      .accounts({
        creator,
        config: configPda,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        user1: user,
        user1TokenAta: userTokenAta,
        user2: user,
        user2TokenAta: userTokenAta,
        user3: user,
        user3TokenAta: userTokenAta,
        user4: user,
        user4TokenAta: userTokenAta,
        user5: user,
        user5TokenAta: userTokenAta,
        user6: user,
        user6TokenAta: userTokenAta,
        // user7: user,
        // user7TokenAta: userTokenAta,
        // user8: user,
        // user8TokenAta: userTokenAta,
        // user8: user,
        // user8TokenAta: userTokenAta,
        // user9: user,
        // user9Ata: userTokenAta,
        // user10: user,
        // user10Ata: userTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
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
  }

  async function pause() {
    const admin = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    await program.methods
      .pause()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();
  }

  async function unpause() {
    const admin = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    await program.methods
      .unpause()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();
  }

  async function startEmergencyMode() {
    const admin = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    await program.methods
      .startEmergencyMode()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();
  }

  async function stopEmergencyMode() {
    const admin = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    await program.methods
      .stopEmergencyMode()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();
  }

  async function emergencyWithdrawSol() {
    const admin = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId,
      );

    await pause();

    // await startEmergencyMode();
    await program.methods
      .startEmergencyMode()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();

    const txSig = await program.methods
      .emergencyWithdrawSol()
      .accounts({
        admin,
        config: configPda,
        globalVault,
        teamWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    let balanceAfterEmergencyWithdraw =
      await provider.connection.getBalance(globalVault);

    assert.strictEqual(balanceAfterEmergencyWithdraw, 890880);

    await unpause();
  }

  async function emergencyWithdrawCoopToken() {
    const admin = provider.wallet.publicKey;
    const creator = provider.wallet.publicKey;

    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );

    // Fetch the config to get `total_coop_created`
    const config = await program.account.configData.fetch(configPda);

    const [globalVault] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('global')],
        program.programId,
      );

    const totalCoopCreated = new BN(config.totalCoopCreated - 1); // e.g., 0
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4); // u64 LE

    const [coopToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), creator.toBuffer(), seedBuffer],
      program.programId,
    );

    const [memecoinPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('memecoin'), coopToken.toBuffer()],
        program.programId,
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

    const adminTokenAta = await getAssociatedTokenAddress(
      coopToken,
      admin,
      false, // allowOwnerOffCurve = false (always false unless you know it's needed)
    );

    await pause();

    // await startEmergencyMode();
    await program.methods
      .startEmergencyMode()
      .accounts({
        admin,
        config: configPda,
      })
      .rpc();

    const txSig = await program.methods
      .emergencyWithdrawCoopToken()
      .accounts({
        admin,
        creator,
        config: configPda,
        globalVault,
        globalTokenAta,
        teamWallet,
        mint: coopToken,
        memecoin: memecoinPda,
        adminTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

    let globalTokenAtaBalance =
      await provider.connection.getTokenAccountBalance(
        globalTokenAta,
      );

    // let balanceAfterEmergencyWithdraw =
    //   await provider.connection.getBalance(globalVault);

    assert.strictEqual(
      globalTokenAtaBalance.value.amount.toString(),
      '0',
    );

    await unpause();
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
