import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { assert } from 'chai';
import {
  program,
  provider,
  teamWallet,
  setup,
  logTx,
} from './helpers/base';

describe('admin', () => {
  it.skip('Is initialized!', async () => {
    const tx = await program.methods.initialize(teamWallet).rpc();
    console.log('Your transaction signature', tx);

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
    assert.strictEqual(configState.teamFee, 100);
    assert.strictEqual(configState.ownerFee, 10);
    assert.strictEqual(configState.affiliatedFee, 10);
    assert.strictEqual(configState.listingFee, 500);
    assert.strictEqual(configState.coopInterval.toNumber(), 200);
    assert.strictEqual(configState.fairlaunchPeriod, 50);
    assert.strictEqual(configState.totalCoopCreated, 0);
    assert.strictEqual(configState.totalCoopListed, 0);
  });

  it.skip('updates the config', async () => {
    const { owner, configPda } = await setup(false);

    const configState = await program.account.configData.fetch(
      configPda,
    );
    console.log('Config state data:', configState);

    const newTeamFee = new anchor.BN(1000);
    const newOwnerFee = new anchor.BN(1000);
    const newCoopInterval = new anchor.BN(200);
    const newFairlaunchPeriod = new anchor.BN(50);
    const newInitVirtualSol = new anchor.BN(5_000_000_000);
    const newInitRealToken = new anchor.BN('1000000000000000000');
    const newMinVoteToken = new anchor.BN(1000_000_000_000);
    const newMinOptionToken = new anchor.BN(1000_000_000_000);
    const newFairlaunchCap = new anchor.BN(2_000_000_000);
    const newTeamWallet = new PublicKey(
      'DczcCAEB3Fo3gd8ahDXjK4qp4geKDF69Xg1XDMcBDZPo',
    );

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
      .accounts({ admin: owner, config: configPda })
      .rpc();

    const config = await program.account.configData.fetch(configPda);
    console.log('Config state data:', config);
    assert.strictEqual(config.ownerFee, newOwnerFee.toNumber());
    assert.strictEqual(
      config.coopInterval.toNumber(),
      newCoopInterval.toNumber(),
    );
  });

  it.skip('updates the config storage', async () => {
    const { owner, configPda } = await setup(false);
    await program.methods
      .updateConfigStorage()
      .accounts({ admin: owner, config: configPda })
      .rpc();
  });

  it.skip('provide roles', async () => {
    const owner = provider.wallet.publicKey;
    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );

    await program.methods
      .grantRole({ creating: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();
    await program.methods
      .grantRole({ voting: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();
    await program.methods
      .grantRole({ listing: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();

    const roleList = await program.account.rbaControlList.fetch(rbac);
    console.log('Role list:', roleList);
  });

  it.skip('revoke roles', async () => {
    const owner = provider.wallet.publicKey;
    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );

    const beforeRevoke = await program.account.rbaControlList.fetch(
      rbac,
    );
    const lengthBefore = beforeRevoke.roles.length;
    console.log(
      'Roles before revoke:',
      lengthBefore,
      beforeRevoke.roles,
    );

    await program.methods
      .revokeRole({ creating: {} }, owner)
      .accounts({ owner })
      .rpc();

    const afterRevoke = await program.account.rbaControlList.fetch(
      rbac,
    );
    const lengthAfter = afterRevoke.roles.length;
    console.log(
      'Roles after revoke:',
      lengthAfter,
      afterRevoke.roles,
    );

    assert.strictEqual(
      lengthAfter,
      lengthBefore - 1,
      'Role Vec length should decrease by 1 after revoke',
    );
    const stillHasRole = afterRevoke.roles.some(
      (r: any) =>
        r.user.toString() === owner.toString() &&
        'creating' in r.roleType,
    );
    assert.isFalse(
      stillHasRole,
      'Revoked role must not remain in the Vec',
    );
  });

  it.skip('provide creator role', async () => {
    const owner = provider.wallet.publicKey;
    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );
    await program.methods
      .grantRole({ creating: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();
    const roleList = await program.account.rbaControlList.fetch(rbac);
    console.log('Role list:', roleList);
  });

  it.skip('provide finalize voting role', async () => {
    const owner = provider.wallet.publicKey;
    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );
    await program.methods
      .grantRole({ voting: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();
    const roleList = await program.account.rbaControlList.fetch(rbac);
    console.log('Role list:', roleList);
  });

  it.skip('provide listing role', async () => {
    const owner = provider.wallet.publicKey;
    const [rbac] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('roles')],
      program.programId,
    );
    await program.methods
      .grantRole({ listing: {} }, owner)
      .accounts({ admin: owner, rbac })
      .rpc();
    const roleList = await program.account.rbaControlList.fetch(rbac);
    console.log('Role list:', roleList);
  });

  it.skip('transfer ownership', async () => {
    const rpcUrl = provider.connection.rpcEndpoint;
    console.log('Cluster RPC:', rpcUrl);

    const [configPda] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('config')],
        program.programId,
      );

    const owner = provider.wallet.publicKey;
    let newOwner = new PublicKey(
      '3octULVVhxV6BKcNtfCU53HQsVhrcKxSA2G3LTUXzPJZ',
    );

    if (rpcUrl.includes('devnet') || rpcUrl.includes('mainnet')) {
      newOwner = new PublicKey(
        '4v1BCT6qefpmKNfgKD1hAZSgnZTFwPadYedGDAWTkN53',
      );
    }

    await program.methods
      .transferOwnership()
      .accounts({
        admin: owner,
        newAdmin: newOwner,
        config: configPda,
      })
      .signers([])
      .rpc();

    const configAccountData = await program.account.configData.fetch(
      configPda,
    );
    console.log('config account', configAccountData);
    assert.equal(
      configAccountData.admin.toString(),
      newOwner.toString(),
    );
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
    const { owner, configPda, globalVault } = await setup(true);
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
    } = await setup(true);

    const admin = owner;

    const config = await program.account.configData.fetch(configPda);

    const totalCoopCreated = new BN(config.totalCoopCreated - 1);
    const seedBuffer = totalCoopCreated
      .addn(1)
      .toArrayLike(Buffer, 'le', 4);

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
