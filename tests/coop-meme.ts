import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { CoopMeme } from '../target/types/coop_meme';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { token } from '@coral-xyz/anchor/dist/cjs/utils';
import { assert } from 'chai';

describe('coop-meme-2', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CoopMeme as Program<CoopMeme>;
  let teamWallet = new PublicKey(
    'An7Lica1BAXqKuY5ScViHwBnQLqnUQt1eYmDvHgYdaMQ'
  );
  let affiliate = provider.wallet.publicKey;

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

  it('Is creating memecoin!', async () => {
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
        new BN('100000'),
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

  it('Is buying memecoin!', async () => {
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
      .buyTokens(new BN(1_000_000), new BN(0))
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

  it('Is selling memecoin!', async () => {
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
});
