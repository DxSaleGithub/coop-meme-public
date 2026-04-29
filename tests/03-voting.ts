import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import {
  program,
  provider,
  setup,
  logTx,
  delay,
  hashOption,
} from './helpers/base';

describe('voting', () => {
  /**
   * Creates two options — each is the full (name, symbol, logo) triple.
   * Option 1: ('Coop', 'COOP', 'uri1')
   * Option 2: ('Coop2', 'COOP2', 'uri2')
   */
  it('first voting with option', async () => {
    await vote_with_option('Coop', 'COOP', 'uri1');
    await vote_with_option('Coop2', 'COOP2', 'uri2');
  });

  it('first voting', async () => {
    await vote('Coop', 'COOP', 'uri1');
    await vote('Coop2', 'COOP2', 'uri2');
  });

  it('first unvoting', async () => {
    await unvote('Coop2', 'COOP2', 'uri2');
  });

  it.skip('multiple buy, sell, vote and unvote', async () => {
    // placeholder for extended scenarios
  });

  it('Is finalizing voting', async () => {
    console.log('Starting wait for trading window to close...');
    await delay(480 * 1000);
    console.log('Wait done. Finalizing vote.');
    await finalizeVote(
      'Coop',
      'COOP',
      'uri1',
      'https://black-bright-snake-211.mypinata.cloud/ipfs/bafkreifkoue4kekaunoi4eu4yzj3z2gwjvlswaamfrl7kf2bg6zohowg5a',
    );
  });

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------

  /**
   * Creates a new combined option (name + symbol + logo) and casts initial votes.
   * The PDA seed is sha256(name || symbol || logo).
   */
  async function vote_with_option(
    name: string,
    symbol: string,
    logo: string,
  ) {
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

    const hashed_option_value = hashOption(name, symbol, logo);

    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
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
    console.log('user balance before vote_with_option', userTokenBal);

    const voteOptionsList =
      await program.account.optionsRegistry.fetch(
        voteOptionsRegistry,
      );
    console.log(
      'current option list length',
      voteOptionsList.tokenRegistry.length,
    );

    const createOption = {
      name,
      symbol,
      logo,
      votes: new BN('1000000000000'),
    };

    const txSig = await program.methods
      .voteWithOption(
        new Uint8Array(hashed_option_value),
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
    await logTx(txSig);

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );
    console.log('user balance after vote_with_option', userTokenBal);

    const voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);
    console.log(
      'vote token pda balance after vote_with_option',
      voteTokenBal,
    );

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user token votes state:', userVotesState);

    const updatedRegistry =
      await program.account.optionsRegistry.fetch(
        voteOptionsRegistry,
      );
    console.log(
      'vote options registry',
      updatedRegistry.tokenRegistry.toString(),
    );
  }

  /**
   * Adds more votes to an existing option identified by (name, symbol, logo).
   */
  async function vote(name: string, symbol: string, logo: string) {
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

    const hashed_option_value = hashOption(name, symbol, logo);

    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
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
    console.log('user balance before vote', userTokenBal);

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
    await logTx(txSig);

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );
    console.log('user balance after vote', userTokenBal);

    const voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);
    console.log('vote token pda balance after vote', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user token votes state:', userVotesState);
  }

  /**
   * Removes votes from an existing option identified by (name, symbol, logo).
   */
  async function unvote(name: string, symbol: string, logo: string) {
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

    const hashed_option_value = hashOption(name, symbol, logo);

    const [tokenOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
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
    console.log('user balance before unvote', userTokenBal);

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
    await logTx(txSig);

    userTokenBal = await provider.connection.getTokenAccountBalance(
      userTokenAta,
    );
    console.log('user balance after unvote', userTokenBal);

    const voteTokenBal =
      await provider.connection.getTokenAccountBalance(voteTokenAta);
    console.log('vote token pda balance after unvote', voteTokenBal);

    const userVotesState = await program.account.userTokenVotes.fetch(
      userTokenVotes,
    );
    console.log('user token votes state:', userVotesState);
  }

  /**
   * Finalizes voting: the VOTING-role admin explicitly passes the winning option
   * account (identified by name+symbol+logo) along with the final IPFS URI for
   * the token metadata update.
   */
  async function finalizeVote(
    name: string,
    symbol: string,
    logo: string,
    finalUri: string,
  ) {
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

    const hashed_option_value = hashOption(name, symbol, logo);

    const [winningOption] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('option'),
          coopToken.toBuffer(),
          hashed_option_value,
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
      .finalizeVote(finalUri)
      .accounts({
        user,
        creator,
        config: configPda,
        rbac,
        globalVault,
        coopToken,
        memecoin: memecoinPda,
        winningOption,
        tokenMetadataAccount: metadataPda,
        mplTokenMetadataProgram: new anchor.web3.PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        ),
      })
      .rpc();

    console.log('Tx hash:', txSig);
    await logTx(txSig);
  }
});
