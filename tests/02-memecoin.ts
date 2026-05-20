import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { assert } from 'chai';
import { ComputeBudgetProgram } from '@solana/web3.js';
import {
  program,
  provider,
  teamWallet,
  affiliate,
  setup,
  logTx,
  delay,
  trader2Keypair,
} from './helpers/base';

describe('memecoin', () => {
  it('Is creating memecoin!', async () => {
    await create_tokens();
  });

  it('first buying memecoin in fairlaunch!', async () => {
    await buy_tokens_fairlaunch(1, '500000000');
  });

  it.skip('multiple buy, sell in fairlaunch', async () => {
    await buy_tokens_fairlaunch(1, '100000000');
    await buy_tokens_fairlaunch(1, '200000000');
    await buy_tokens_fairlaunch(1, '300000000');
    await buy_tokens_fairlaunch(1, '400000000');
    await sell_tokens_fairlaunch(1, '50000000');
    await sell_tokens_fairlaunch(1, '50000000');
    await sell_tokens_fairlaunch(1, '50000000');
  });

  it('first buying memecoin!', async () => {
    console.log('Starting wait for fairlaunch to end...');
    await delay(130 * 1000);
    console.log('Wait done.');
    await buy_tokens('500000000');
    await buy_tokens('500000000');
  });

  it('refund sol and claim tokens after first buy in bonding-curve', async () => {
    await claim_and_refund(1);
  });

  it('first selling memecoin!', async () => {
    await sell_tokens(new BN('1000000000000'));
  });

  it.skip('2 users buy but no one sell -> mcap not reached -> both claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '2000000000');
    await buy_tokens_fairlaunch(1, '3000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '2000000000');
    await buy_tokens_fairlaunch(2, '3000000000');
    await delay(100 * 1000);
    await buy_tokens('100000000');
    await claim_and_refund(1);
    await claim_and_refund(2);
  });

  it.skip('2 users buy but one sells -> mcap not reached -> both claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '2000000000');
    await buy_tokens_fairlaunch(1, '3000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '2000000000');
    await buy_tokens_fairlaunch(2, '3000000000');
    await sell_tokens_fairlaunch(1, '5400000000');
    await delay(100 * 1000);
    await buy_tokens('100000000');
    await claim_and_refund(1);
    await claim_and_refund(2);
  });

  it.skip('2 users buy but one sells -> mcap reached -> both claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '5000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '5000000000');
    await buy_tokens_fairlaunch(2, '9000000000');
    await sell_tokens_fairlaunch(1, '5400000000');
    await delay(100 * 1000);
    await buy_tokens('100000000');
    await claim_and_refund(1);
    await claim_and_refund(2);
  });

  it.skip('2 users buy but one sells all -> mcap reached -> both claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '5000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '10000000000');
    await buy_tokens_fairlaunch(2, '20000000000');
    await sell_tokens_fairlaunch(1, '13500000000');
    await delay(100 * 1000);
    await buy_tokens('100000000');
    await claim_and_refund(2);
  });

  it.skip('2 users buy but no one sell -> greater than mcap reached -> both claim-n-refund', async () => {
    await buy_tokens_fairlaunch(1, '1000000000');
    await buy_tokens_fairlaunch(1, '6000000000');
    await buy_tokens_fairlaunch(1, '9000000000');
    await buy_tokens_fairlaunch(2, '1000000000');
    await buy_tokens_fairlaunch(2, '5000000000');
    await buy_tokens_fairlaunch(2, '5000000000');
    await delay(100 * 1000);
    await buy_tokens('100000000');
    await claim_and_refund(1);
    await claim_and_refund(2);
  });

  it.skip('multiple buy, sell, vote and unvote', async () => {
    await buy_tokens('100000000');
    await buy_tokens('100000000');
    await sell_tokens(new BN('1000000000000'));
    await sell_tokens(new BN('1000000000000'));
    await sell_tokens(new BN('1000000000000'));
  });

  it.skip('emergency withdraw SOL', async () => {
    await emergencyWithdrawSol();
  });

  it.skip('emergency withdraw Coop token', async () => {
    await emergencyWithdrawCoopToken();
  });

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  async function create_tokens() {
    const {
      creator,
      configPda,
      rbac,
      globalVault,
      coopToken,
      memecoinPda,
      metadataPda,
      globalTokenAta,
      voteTokenAta,
      voteOptionsRegistry,
      coopTokenNonce,
    } = await setup(true);

    let config = await program.account.configData.fetch(configPda);
    const totalCoopCreated = new BN(config.totalCoopCreated);

    config = await program.account.configData.fetch(configPda);
    console.log('Config state -> is paused:', config.isPaused);

    const setComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    });

    console.log('coop token in create', coopToken.toString());
    console.log(
      'global token ata in create',
      globalTokenAta.toString(),
    );

    const txSig = await program.methods
      .createToken(
        new BN(coopTokenNonce),
        new BN('1000000000000000000'),
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
        memecoin: memecoinPda,
        tokenMetadataAccount: metadataPda,
        globalTokenAta,
        voteTokenAta,
        voteOptionsRegistry,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram:
          anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([setComputeUnits])
      .rpc();

    console.log('Tx hash:', txSig);
    await logTx(txSig);

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

  async function buy_tokens_fairlaunch(
    keypair: number,
    sol_amount: string,
  ) {
    const {
      trader,
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
    let signers: any[] = [];
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
      .signers(signers)
      .rpc();

    console.log('Tx hash:', txSig);
    await logTx(txSig);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'virtual sol reserves:',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'virtual token reserves:',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'real sol reserves:',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'real token reserves:',
      memecoinState.realTokenReserves.toString(),
    );
    console.log(
      'fairlaunch token reserves:',
      memecoinState.fairlaunchTokenReserves.toString(),
    );
    console.log(
      'fairlaunch sol raised:',
      memecoinState.fairlaunchSolRaised.toString(),
    );
    console.log(
      'fairlaunch cap:',
      memecoinState.fairlaunchCap.toString(),
    );
    console.log('total votes:', memecoinState.totalVotes.toString());
    console.log(
      'total options:',
      memecoinState.totalOptions.toString(),
    );
    console.log(
      'buy cap:',
      memecoinState.bondingCurveBuyCap.toString(),
    );
    console.log(
      'fairlaunch buyers:',
      memecoinState.fairlaunchBuyers.toString(),
    );

    const userDataState = await program.account.userData.fetch(
      finalUserData,
    );
    console.log(
      'user sol deposit:',
      userDataState.solDeposit.toString(),
    );
    console.log(
      'tokens claimed?',
      userDataState.tokensClaimed.toString(),
    );
    console.log('refund?', userDataState.refund.toString());
  }

  async function sell_tokens_fairlaunch(
    keypair: number,
    sol_amount: string,
  ) {
    const {
      trader,
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
    let signers: any[] = [];
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
    await logTx(txSig);

    const memecoinState = await program.account.memeCoinData.fetch(
      memecoinPda,
    );
    console.log(
      'virtual sol reserves:',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'real sol reserves:',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'real token reserves:',
      memecoinState.realTokenReserves.toString(),
    );
  }

  async function buy_tokens(sol_amount: string) {
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
    await logTx(txSig);

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
      'virtual sol reserves:',
      memecoinState.virtualSolReserves.toString(),
    );
    console.log(
      'virtual token reserves:',
      memecoinState.virtualTokenReserves.toString(),
    );
    console.log(
      'real sol reserves:',
      memecoinState.realSolReserves.toString(),
    );
    console.log(
      'real token reserves:',
      memecoinState.realTokenReserves.toString(),
    );
    console.log('total votes:', memecoinState.totalVotes.toString());
    console.log(
      'total options:',
      memecoinState.totalOptions.toString(),
    );
    console.log(
      'buy cap:',
      memecoinState.bondingCurveBuyCap.toString(),
    );
  }

  async function sell_tokens(token_amount: typeof BN.prototype) {
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
    await logTx(txSig);

    let userTokenBal =
      await provider.connection.getTokenAccountBalance(
        traderTokenAta,
      );
    console.log(
      'user balance after selling in bonding curve',
      userTokenBal,
    );
  }

  async function claim(keypair: number) {
    const {
      trader,
      trader2,
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
    let signers: any[] = [];
    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      finalTraderTokenAta = trader2TokenAta;
      signers.push(trader2Keypair);
    }

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
    await logTx(txSig);

    const userTokenBal =
      await provider.connection.getTokenAccountBalance(
        finalTraderTokenAta,
      );
    console.log(
      'user balance after claim',
      userTokenBal.value.uiAmountString,
    );
  }

  async function claim_and_refund(keypair: number) {
    const {
      trader,
      trader2,
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
    let signers: any[] = [];
    if (keypair == 2) {
      finalTrader = trader2;
      finalUserData = user2Data;
      finalTraderTokenAta = trader2TokenAta;
      signers.push(trader2Keypair);
    }

    const solBefore = await provider.connection.getBalance(
      finalTrader,
    );
    console.log(
      'user sol balance before refund',
      solBefore.toString(),
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
      .signers(signers)
      .rpc();

    console.log('Tx hash:', txSig);
    await logTx(txSig);

    const userTokenBal =
      await provider.connection.getTokenAccountBalance(
        finalTraderTokenAta,
      );
    console.log(
      'user balance after claim',
      userTokenBal.value.uiAmountString,
    );

    const solAfter = await provider.connection.getBalance(
      finalTrader,
    );
    console.log('user sol balance after refund', solAfter.toString());
  }

  async function pause() {
    const admin = provider.wallet.publicKey;
    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId,
    );
    await program.methods
      .pause()
      .accounts({ admin, config: configPda })
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
      .accounts({ admin, config: configPda })
      .rpc();
  }

  async function emergencyWithdrawSol() {
    const { owner, configPda, globalVault } = await setup(false);
    const admin = owner;

    await pause();
    await program.methods
      .startEmergencyMode()
      .accounts({ admin, config: configPda })
      .rpc();

    const balanceBefore = await provider.connection.getBalance(
      teamWallet,
    );

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
    await logTx(txSig);

    const balanceAfter = await provider.connection.getBalance(
      teamWallet,
    );
    assert(balanceAfter > balanceBefore);
    await unpause();
  }

  async function emergencyWithdrawCoopToken() {
    const {
      owner,
      creator,
      configPda,
      globalVault,
      coopToken,
      memecoinPda,
      globalTokenAta,
    } = await setup(false);

    const admin = owner;

    const { getAssociatedTokenAddress } = await import(
      '@solana/spl-token'
    );
    const adminTokenAta = await getAssociatedTokenAddress(
      coopToken,
      admin,
      false,
    );

    await pause();
    await program.methods
      .startEmergencyMode()
      .accounts({ admin, config: configPda })
      .rpc();

    console.log('coop token', coopToken.toString());
    console.log('global token ata', globalTokenAta.toString());

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
    await logTx(txSig);

    const globalBal =
      await provider.connection.getTokenAccountBalance(
        globalTokenAta,
      );
    assert.strictEqual(globalBal.value.amount.toString(), '0');
    await unpause();
  }
});
