import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import {
  NATIVE_MINT,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { ComputeBudgetProgram } from '@solana/web3.js';
import {
  program,
  provider,
  teamWallet,
  cpSwapProgram,
  ammConfig,
  createPoolFee,
  setup,
  logTx,
} from './helpers/base';

describe('raydium', () => {
  it('Is listing memecoin!', async () => {
    await listToken();
  });

  it('unvoting all tokens', async () => {
    await unvote_all_tokens();
  });

  it.skip('unfreeze all tokens', async () => {
    await unfreeze_multiple_users();
  });

  it.skip('revoke freeze authority', async () => {
    await revokeFreezeAuthority();
  });

  it('Is swapping SOL to memecoin!', async () => {
    const {
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
      false,
    );
    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false,
    );

    const {
      poolState,
      token0Vault,
      token1Vault,
      authority,
      observationState,
    } = deriveRaydiumPdas(token0Mint, token1Mint);

    console.log(ownerToken0.toString(), ownerToken1.toString());

    const txSig = await program.methods
      .swapTokenBaseInput(new BN(100000000), new BN(0))
      .accounts({
        payer,
        cpSwapProgram,
        authority,
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
    await logTx(txSig);

    const configState = await program.account.configData.fetch(
      configPda,
    );
    console.log('Config state data:', configState);
  });

  it('Is swapping memecoin to SOL!', async () => {
    const { creator, configPda, coopToken } = await setup(false);
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
      false,
    );
    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      payer,
      false,
    );

    const {
      poolState,
      token0Vault,
      token1Vault,
      authority,
      observationState,
    } = deriveRaydiumPdas(token0Mint, token1Mint);

    console.log(ownerToken0.toString(), ownerToken1.toString());

    const userTokenBal =
      await provider.connection.getTokenAccountBalance(ownerToken1);

    const txSig = await program.methods
      .swapTokenBaseOutput(
        new BN(userTokenBal.value.amount),
        new BN(1_00_00_00),
      )
      .accounts({
        payer,
        cpSwapProgram,
        authority,
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
    await logTx(txSig);

    const configState = await program.account.configData.fetch(
      configPda,
    );
    console.log('Config state data:', configState);
  });

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  function deriveRaydiumPdas(
    token0Mint: PublicKey,
    token1Mint: PublicKey,
  ) {
    const [poolState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        ammConfig.toBuffer(),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
      ],
      cpSwapProgram,
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
      cpSwapProgram,
    );

    const [observationState] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('observation'), poolState.toBuffer()],
        cpSwapProgram,
      );

    return {
      poolState,
      token0Vault,
      token1Vault,
      authority,
      observationState,
    };
  }

  async function listToken() {
    const {
      user,
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
      user,
      false,
    );
    const ownerToken1 = await getAssociatedTokenAddress(
      token1Mint,
      user,
      false,
    );

    const {
      poolState,
      token0Vault,
      token1Vault,
      authority,
      observationState,
    } = deriveRaydiumPdas(token0Mint, token1Mint);

    console.log(ownerToken0.toString(), ownerToken1.toString());

    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool_lp_mint'), poolState.toBuffer()],
      cpSwapProgram,
    );

    const [ownerLpToken] = await PublicKey.findProgramAddress(
      [
        creator.toBuffer(),
        anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(),
        lpMint.toBuffer(),
      ],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    );

    const txSig = await program.methods
      .listToken()
      .accounts({
        user,
        creator,
        teamWallet,
        config: configPda,
        rbac,
        globalVault,
        token0Mint,
        token1Mint,
        coopToken,
        memecoin: memecoinPda,
        globalTokenAta,
        ownerToken0,
        ownerToken1,
        nativeMint: NATIVE_MINT,
        lpMint,
        ownerLpToken,
        token0Vault,
        token1Vault,
        createPoolFee,
        observationState,
        cpSwapProgram,
        ammConfig,
        authority,
        poolState,
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
    await logTx(txSig);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'Memecoin market end time:',
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
    console.log('user balance before unvote_all', userTokenBal);

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
    await logTx(txSig);

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );
    console.log('user balance after unvote_all', userTokenBal);

    const voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);
    console.log(
      'vote token pda balance after unvote_all',
      voteTokenBal,
    );

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user token votes state:', userVotesState);
  }

  async function unfreeze_multiple_users() {
    const {
      user,
      creator,
      rbac,
      configPda,
      globalVault,
      coopToken,
      userTokenAta,
    } = await setup(false);

    const txSig = await program.methods
      .unfreezeMultipleAccounts()
      .accounts({
        creator,
        config: configPda,
        globalVault,
        rbac,
        coopToken,
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
        user7: user,
        user7TokenAta: userTokenAta,
        user8: user,
        user8TokenAta: userTokenAta,
        user9: user,
        user9TokenAta: userTokenAta,
        user10: user,
        user10TokenAta: userTokenAta,
        user11: user,
        user11TokenAta: userTokenAta,
        user12: user,
        user12TokenAta: userTokenAta,
        user13: user,
        user13TokenAta: userTokenAta,
        user14: user,
        user14TokenAta: userTokenAta,
        user15: user,
        user15TokenAta: userTokenAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log('Tx hash:', txSig);
    await logTx(txSig);
  }

  async function revokeFreezeAuthority() {
    const {
      user,
      creator,
      rbac,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
    } = await setup(false);

    await program.methods
      .revokeFreezeAuthority()
      .accounts({
        user,
        creator,
        config: configPda,
        globalVault,
        rbac,
        coopToken,
        memecoin: memecoinPda,
      })
      .rpc();
  }
});
