/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/coop_meme.json`.
 */
export type CoopMeme = {
  "address": "58Pbrmtb3Ai1S1vtafW8CrvrUZGhgtRGxDErzr4oVvcu",
  "metadata": {
    "name": "coopMeme",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burnLpToken",
      "discriminator": [
        246,
        132,
        119,
        245,
        169,
        239,
        213,
        210
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "token0Mint"
        },
        {
          "name": "token1Mint"
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "lpMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "ownerLpToken",
          "writable": true
        },
        {
          "name": "cpSwapProgram",
          "address": "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb"
        },
        {
          "name": "ammConfig",
          "docs": [
            "Which config the pool belongs to."
          ]
        },
        {
          "name": "poolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "ammConfig"
              },
              {
                "kind": "account",
                "path": "token0Mint"
              },
              {
                "kind": "account",
                "path": "token1Mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Program to create mint account and mint tokens"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Program to create an ATA for receiving position NFT"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "To create a new program account"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "docs": [
            "Sysvar for program account"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "buyTokens",
      "discriminator": [
        189,
        21,
        230,
        133,
        247,
        2,
        110,
        42
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "affiliate",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "traderTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "mplTokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minTokensReceive",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createToken",
      "discriminator": [
        84,
        52,
        204,
        228,
        24,
        140,
        234,
        75
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rbac",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "writable": true
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "tokenMetadataAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "voteTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memecoin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "mplTokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      "args": [
        {
          "name": "totalSupply",
          "type": "u64"
        },
        {
          "name": "tokenSharePrice",
          "type": "u32"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "emergencyWithdrawCoopToken",
      "discriminator": [
        253,
        200,
        248,
        16,
        24,
        153,
        55,
        80
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "mint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "adminTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "emergencyWithdrawSol",
      "discriminator": [
        219,
        156,
        123,
        176,
        91,
        105,
        30,
        160
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finalizeVote",
      "discriminator": [
        181,
        176,
        6,
        248,
        249,
        134,
        146,
        56
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rbac",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "nameOption",
          "writable": true
        },
        {
          "name": "symbolOption",
          "writable": true
        },
        {
          "name": "uriOption",
          "writable": true
        },
        {
          "name": "tokenMetadataAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "mplTokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      "args": []
    },
    {
      "name": "grantRole",
      "discriminator": [
        218,
        234,
        128,
        15,
        82,
        33,
        236,
        253
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "rbac",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roleType",
          "type": {
            "defined": {
              "name": "roleType"
            }
          }
        },
        {
          "name": "user",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rbac",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "globalWsolAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "nativeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "nativeMint",
          "address": "So11111111111111111111111111111111111111112"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "teamWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "listToken",
      "discriminator": [
        210,
        166,
        134,
        74,
        206,
        157,
        92,
        138
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "rbac",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "token0Mint"
        },
        {
          "name": "token1Mint"
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "ownerToken0",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token0Mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "ownerToken1",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token1Mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lpMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "ownerLpToken",
          "writable": true
        },
        {
          "name": "token0Vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              },
              {
                "kind": "account",
                "path": "token0Mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "token1Vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              },
              {
                "kind": "account",
                "path": "token1Mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "createPoolFee",
          "writable": true,
          "address": "3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy"
        },
        {
          "name": "observationState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  98,
                  115,
                  101,
                  114,
                  118,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "poolState"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "cpSwapProgram",
          "address": "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb"
        },
        {
          "name": "ammConfig",
          "docs": [
            "Which config the pool belongs to."
          ]
        },
        {
          "name": "authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "poolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "ammConfig"
              },
              {
                "kind": "account",
                "path": "token0Mint"
              },
              {
                "kind": "account",
                "path": "token1Mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "nativeMint",
          "address": "So11111111111111111111111111111111111111112"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Program to create mint account and mint tokens"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Program to create an ATA for receiving position NFT"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "To create a new program account"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "docs": [
            "Sysvar for program account"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "revokeRole",
      "discriminator": [
        179,
        232,
        2,
        180,
        48,
        227,
        82,
        7
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "rbac",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roleType",
          "type": {
            "defined": {
              "name": "roleType"
            }
          }
        },
        {
          "name": "user",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "sellTokens",
      "discriminator": [
        114,
        242,
        25,
        12,
        62,
        126,
        92,
        2
      ],
      "accounts": [
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "affiliate",
          "writable": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "traderTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "mplTokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minSolReceive",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startEmergencyMode",
      "discriminator": [
        142,
        34,
        175,
        73,
        55,
        191,
        23,
        167
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "stopEmergencyMode",
      "discriminator": [
        182,
        27,
        31,
        1,
        206,
        90,
        172,
        138
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "swapTokenBaseInput",
      "discriminator": [
        121,
        128,
        77,
        79,
        154,
        15,
        96,
        179
      ],
      "accounts": [
        {
          "name": "cpSwapProgram",
          "address": "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb"
        },
        {
          "name": "payer",
          "docs": [
            "The user performing the swap"
          ],
          "signer": true
        },
        {
          "name": "authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "inputTokenAccount",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputTokenAccount",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputTokenProgram",
          "docs": [
            "SPL program for input token transfers"
          ]
        },
        {
          "name": "outputTokenProgram",
          "docs": [
            "SPL program for output token transfers"
          ]
        },
        {
          "name": "inputTokenMint",
          "docs": [
            "The mint of input token"
          ]
        },
        {
          "name": "outputTokenMint",
          "docs": [
            "The mint of output token"
          ]
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minimumAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swapTokenBaseOutput",
      "discriminator": [
        3,
        84,
        206,
        121,
        250,
        64,
        245,
        100
      ],
      "accounts": [
        {
          "name": "cpSwapProgram",
          "address": "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb"
        },
        {
          "name": "payer",
          "docs": [
            "The user performing the swap"
          ],
          "signer": true
        },
        {
          "name": "authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  110,
                  100,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              }
            ],
            "program": {
              "kind": "account",
              "path": "cpSwapProgram"
            }
          }
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "inputTokenAccount",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputTokenAccount",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputTokenProgram",
          "docs": [
            "SPL program for input token transfers"
          ]
        },
        {
          "name": "outputTokenProgram",
          "docs": [
            "SPL program for output token transfers"
          ]
        },
        {
          "name": "inputTokenMint",
          "docs": [
            "The mint of input token"
          ]
        },
        {
          "name": "outputTokenMint",
          "docs": [
            "The mint of output token"
          ]
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "maxAmountIn",
          "type": "u64"
        },
        {
          "name": "amountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "unvote",
      "discriminator": [
        181,
        169,
        220,
        24,
        207,
        114,
        148,
        223
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "tokenOption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              },
              {
                "kind": "account",
                "path": "token_option.index",
                "account": "tokenOption"
              }
            ]
          }
        },
        {
          "name": "userTokenVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "userTokenOptionVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenOption"
              }
            ]
          }
        },
        {
          "name": "userTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "voteTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memecoin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "votes",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unvoteAllTokens",
      "discriminator": [
        241,
        136,
        191,
        240,
        113,
        222,
        21,
        32
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "userTokenVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "userTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "voteTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memecoin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newTeamFee",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newOwnerFee",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newAffiliatedFee",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newListingFee",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newTeamWallet",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newCoopInterval",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newFairlaunchPeriod",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newMinPricePerToken",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newMaxPricePerToken",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "newInitVirtualSol",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newInitVirtualToken",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newMinVoteTokenAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newMinOptionAddTokenAmount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "tokenOption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              },
              {
                "kind": "account",
                "path": "token_option.index",
                "account": "tokenOption"
              }
            ]
          }
        },
        {
          "name": "userTokenVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "userTokenOptionVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenOption"
              }
            ]
          }
        },
        {
          "name": "userTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "voteTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memecoin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "votes",
          "type": "u64"
        }
      ]
    },
    {
      "name": "voteWithOption",
      "discriminator": [
        193,
        131,
        116,
        197,
        251,
        185,
        23,
        44
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "coopToken",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "tokenOption",
          "writable": true
        },
        {
          "name": "userTokenVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ]
          }
        },
        {
          "name": "userTokenOptionVotes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenOption"
              }
            ]
          }
        },
        {
          "name": "userTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "voteTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memecoin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "coopToken"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "createOption",
          "type": {
            "defined": {
              "name": "createOptionInfo"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawListedCoopToken",
      "discriminator": [
        150,
        47,
        83,
        85,
        160,
        133,
        148,
        22
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "globalVault",
          "docs": [
            "It does not store any data and is used only for lamport/token transfers.",
            "PDA seeds = [b\"global\"], bump = config.global_vault_bump"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "globalTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "globalVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "teamWallet",
          "writable": true
        },
        {
          "name": "mint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "memecoin.token_id",
                "account": "memeCoinData"
              }
            ]
          }
        },
        {
          "name": "memecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "adminTokenAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "ammConfig",
      "discriminator": [
        218,
        244,
        33,
        104,
        203,
        203,
        43,
        111
      ]
    },
    {
      "name": "configData",
      "discriminator": [
        221,
        205,
        236,
        51,
        101,
        165,
        133,
        250
      ]
    },
    {
      "name": "memeCoinData",
      "discriminator": [
        188,
        111,
        97,
        147,
        28,
        220,
        248,
        79
      ]
    },
    {
      "name": "observationState",
      "discriminator": [
        122,
        174,
        197,
        53,
        129,
        9,
        165,
        132
      ]
    },
    {
      "name": "poolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "rbaControlList",
      "discriminator": [
        3,
        8,
        137,
        150,
        220,
        147,
        174,
        207
      ]
    },
    {
      "name": "tokenOption",
      "discriminator": [
        102,
        168,
        137,
        89,
        184,
        28,
        171,
        129
      ]
    },
    {
      "name": "userTokenOptionVotes",
      "discriminator": [
        114,
        9,
        57,
        179,
        16,
        232,
        104,
        49
      ]
    },
    {
      "name": "userTokenVotes",
      "discriminator": [
        228,
        141,
        67,
        99,
        77,
        145,
        213,
        182
      ]
    }
  ],
  "events": [
    {
      "name": "bondingCurveStartedEvent",
      "discriminator": [
        42,
        6,
        201,
        28,
        8,
        237,
        215,
        231
      ]
    },
    {
      "name": "burnEvent",
      "discriminator": [
        33,
        89,
        47,
        117,
        82,
        124,
        238,
        250
      ]
    },
    {
      "name": "createdEvent",
      "discriminator": [
        231,
        117,
        250,
        141,
        110,
        243,
        96,
        47
      ]
    },
    {
      "name": "listEvent",
      "discriminator": [
        131,
        251,
        20,
        8,
        113,
        195,
        210,
        18
      ]
    },
    {
      "name": "tradeEvent",
      "discriminator": [
        189,
        219,
        127,
        211,
        78,
        230,
        97,
        238
      ]
    },
    {
      "name": "tradingOverEvent",
      "discriminator": [
        159,
        210,
        41,
        22,
        139,
        105,
        112,
        35
      ]
    },
    {
      "name": "unlockAllTokens",
      "discriminator": [
        232,
        163,
        184,
        18,
        68,
        16,
        93,
        98
      ]
    },
    {
      "name": "voteEvent",
      "discriminator": [
        195,
        71,
        250,
        105,
        120,
        119,
        234,
        134
      ]
    },
    {
      "name": "voteFinalizedEvent",
      "discriminator": [
        76,
        50,
        16,
        156,
        100,
        1,
        45,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Only the admin is authorized to perform this action."
    },
    {
      "code": 6001,
      "name": "invalidTotalSupply",
      "msg": "Invalid total supply"
    },
    {
      "code": 6002,
      "name": "tradingNotActive",
      "msg": "Trading not active"
    },
    {
      "code": 6003,
      "name": "insufficientAmount",
      "msg": "Insufficient Amount"
    },
    {
      "code": 6004,
      "name": "invalidFairSharePrice",
      "msg": "Invalid fairshare token price"
    },
    {
      "code": 6005,
      "name": "invalidTokenName",
      "msg": "Invalid coop token name"
    },
    {
      "code": 6006,
      "name": "invalidTokenSymbol",
      "msg": "Invalid coop token symbol"
    },
    {
      "code": 6007,
      "name": "invalidTokenUri",
      "msg": "Invalid coop token uri"
    },
    {
      "code": 6008,
      "name": "invalidOperation",
      "msg": "Invalid arithmetic operation"
    },
    {
      "code": 6009,
      "name": "tradingActive",
      "msg": "Trading active"
    },
    {
      "code": 6010,
      "name": "notEnoughToken",
      "msg": "Not enough token"
    },
    {
      "code": 6011,
      "name": "notEnoughSol",
      "msg": "Not enough sol"
    },
    {
      "code": 6012,
      "name": "invalidTokenVoteInfo",
      "msg": "Invalid token vote info"
    },
    {
      "code": 6013,
      "name": "votingNotFinalized",
      "msg": "Token voting is not finalized"
    },
    {
      "code": 6014,
      "name": "votingFinalized",
      "msg": "Token voting is finalized"
    },
    {
      "code": 6015,
      "name": "tokenAlreadyListed",
      "msg": "Token is already listed"
    },
    {
      "code": 6016,
      "name": "tokenNotListed",
      "msg": "Token not listed"
    },
    {
      "code": 6017,
      "name": "invalidListingInfo",
      "msg": "Listing info not valid"
    },
    {
      "code": 6018,
      "name": "optionLimitExceeded",
      "msg": "Option limit exceeded"
    },
    {
      "code": 6019,
      "name": "tokenOptionAlreadyExist",
      "msg": "Token Option already exist"
    },
    {
      "code": 6020,
      "name": "invalidOption",
      "msg": "Token Option invalid"
    },
    {
      "code": 6021,
      "name": "roleExist",
      "msg": "Role already exists"
    },
    {
      "code": 6022,
      "name": "roleDoesNotExist",
      "msg": "Role does not exist"
    },
    {
      "code": 6023,
      "name": "inSufficientRole",
      "msg": "Signer does not have sufficient role"
    },
    {
      "code": 6024,
      "name": "paused",
      "msg": "Operation is paused currently"
    },
    {
      "code": 6025,
      "name": "notPaused",
      "msg": "Operation is not paused currently"
    },
    {
      "code": 6026,
      "name": "inEmergency",
      "msg": "Operation is in emergency mode"
    },
    {
      "code": 6027,
      "name": "notInEmergency",
      "msg": "Operation is not in emergency mode"
    }
  ],
  "types": [
    {
      "name": "ammConfig",
      "docs": [
        "Holds the current owner of the factory"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": "u8"
          },
          {
            "name": "disableCreatePool",
            "docs": [
              "Status to control if new pool can be create"
            ],
            "type": "bool"
          },
          {
            "name": "index",
            "docs": [
              "Config index"
            ],
            "type": "u16"
          },
          {
            "name": "tradeFeeRate",
            "docs": [
              "The trade fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeeRate",
            "docs": [
              "The protocol fee"
            ],
            "type": "u64"
          },
          {
            "name": "fundFeeRate",
            "docs": [
              "The fund fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u64"
          },
          {
            "name": "createPoolFee",
            "docs": [
              "Fee for create a new pool"
            ],
            "type": "u64"
          },
          {
            "name": "protocolOwner",
            "docs": [
              "Address of the protocol fee owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "fundOwner",
            "docs": [
              "Address of the fund fee owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "padding",
            "docs": [
              "padding"
            ],
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bondingCurveStartedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "burnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "lpMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "configData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "inEmergency",
            "type": "bool"
          },
          {
            "name": "teamWallet",
            "type": "pubkey"
          },
          {
            "name": "teamFee",
            "type": "u16"
          },
          {
            "name": "ownerFee",
            "type": "u16"
          },
          {
            "name": "affiliatedFee",
            "type": "u16"
          },
          {
            "name": "listingFee",
            "type": "u16"
          },
          {
            "name": "coopInterval",
            "type": "u64"
          },
          {
            "name": "fairlaunchPeriod",
            "type": "u32"
          },
          {
            "name": "minPricePerToken",
            "type": "u32"
          },
          {
            "name": "maxPricePerToken",
            "type": "u32"
          },
          {
            "name": "initVirtualSol",
            "type": "u64"
          },
          {
            "name": "initVirtualToken",
            "type": "u64"
          },
          {
            "name": "minVoteTokenAmount",
            "type": "u64"
          },
          {
            "name": "minOptionAddTokenAmount",
            "type": "u64"
          },
          {
            "name": "totalCoopCreated",
            "type": "u32"
          },
          {
            "name": "totalCoopListed",
            "type": "u32"
          },
          {
            "name": "configBump",
            "type": "u8"
          },
          {
            "name": "globalVaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "createOptionInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionType",
            "type": {
              "defined": {
                "name": "optionType"
              }
            }
          },
          {
            "name": "optionValue",
            "type": "string"
          },
          {
            "name": "votes",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createdEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenId",
            "type": "u32"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "metadata",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "tokenSupply",
            "type": "u64"
          },
          {
            "name": "tokenCreationTime",
            "type": "u64"
          },
          {
            "name": "tokenFairlaunchEndTime",
            "type": "u64"
          },
          {
            "name": "tokenMarketEndTime",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "listEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "tokenIn",
            "type": "u64"
          },
          {
            "name": "solIn",
            "type": "u64"
          },
          {
            "name": "lpMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "memeCoinData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenId",
            "type": "u32"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tokenSharePrice",
            "type": "u32"
          },
          {
            "name": "tokenTotalSupply",
            "type": "u64"
          },
          {
            "name": "tokenCreationTime",
            "type": "u64"
          },
          {
            "name": "tokenFairlaunchEndTime",
            "type": "u64"
          },
          {
            "name": "tokenMarketEndTime",
            "type": "u64"
          },
          {
            "name": "virtualSolReserves",
            "type": "u64"
          },
          {
            "name": "virtualTokenReserves",
            "type": "u64"
          },
          {
            "name": "realSolReserves",
            "type": "u64"
          },
          {
            "name": "realTokenReserves",
            "type": "u64"
          },
          {
            "name": "isBondingCurveActive",
            "type": "bool"
          },
          {
            "name": "isTradingActive",
            "type": "bool"
          },
          {
            "name": "isVotingFinalized",
            "type": "bool"
          },
          {
            "name": "isTokenListed",
            "type": "bool"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "totalOptions",
            "type": "u32"
          },
          {
            "name": "memecoinBump",
            "type": "u8"
          },
          {
            "name": "tokenBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "observation",
      "docs": [
        "The element of observations in ObservationState"
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "blockTimestamp",
            "docs": [
              "The block timestamp of the observation"
            ],
            "type": "u64"
          },
          {
            "name": "cumulativeToken0PriceX32",
            "docs": [
              "the cumulative of token0 price during the duration time, Q32.32, the remaining 64 bit for overflow"
            ],
            "type": "u128"
          },
          {
            "name": "cumulativeToken1PriceX32",
            "docs": [
              "the cumulative of token1 price during the duration time, Q32.32, the remaining 64 bit for overflow"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "observationState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "docs": [
              "Whether the ObservationState is initialized"
            ],
            "type": "bool"
          },
          {
            "name": "observationIndex",
            "docs": [
              "the most-recently updated index of the observations array"
            ],
            "type": "u16"
          },
          {
            "name": "poolId",
            "type": "pubkey"
          },
          {
            "name": "observations",
            "docs": [
              "observation array"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "observation"
                  }
                },
                100
              ]
            }
          },
          {
            "name": "padding",
            "docs": [
              "padding for feature update"
            ],
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "optionType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "name"
          },
          {
            "name": "sym"
          },
          {
            "name": "uri"
          }
        ]
      }
    },
    {
      "name": "poolState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ammConfig",
            "docs": [
              "Which config the pool belongs"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolCreator",
            "docs": [
              "pool creator"
            ],
            "type": "pubkey"
          },
          {
            "name": "token0Vault",
            "docs": [
              "Token A"
            ],
            "type": "pubkey"
          },
          {
            "name": "token1Vault",
            "docs": [
              "Token B"
            ],
            "type": "pubkey"
          },
          {
            "name": "lpMint",
            "docs": [
              "Pool tokens are issued when A or B tokens are deposited.",
              "Pool tokens can be withdrawn back to the original A or B token."
            ],
            "type": "pubkey"
          },
          {
            "name": "token0Mint",
            "docs": [
              "Mint information for token A"
            ],
            "type": "pubkey"
          },
          {
            "name": "token1Mint",
            "docs": [
              "Mint information for token B"
            ],
            "type": "pubkey"
          },
          {
            "name": "token0Program",
            "docs": [
              "token_0 program"
            ],
            "type": "pubkey"
          },
          {
            "name": "token1Program",
            "docs": [
              "token_1 program"
            ],
            "type": "pubkey"
          },
          {
            "name": "observationKey",
            "docs": [
              "observation account to store oracle data"
            ],
            "type": "pubkey"
          },
          {
            "name": "authBump",
            "type": "u8"
          },
          {
            "name": "status",
            "docs": [
              "Bitwise representation of the state of the pool",
              "bit0, 1: disable deposit(vaule is 1), 0: normal",
              "bit1, 1: disable withdraw(vaule is 2), 0: normal",
              "bit2, 1: disable swap(vaule is 4), 0: normal"
            ],
            "type": "u8"
          },
          {
            "name": "lpMintDecimals",
            "type": "u8"
          },
          {
            "name": "mint0Decimals",
            "docs": [
              "mint0 and mint1 decimals"
            ],
            "type": "u8"
          },
          {
            "name": "mint1Decimals",
            "type": "u8"
          },
          {
            "name": "lpSupply",
            "docs": [
              "lp mint supply"
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeesToken0",
            "docs": [
              "The amounts of token_0 and token_1 that are owed to the liquidity provider."
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeesToken1",
            "type": "u64"
          },
          {
            "name": "fundFeesToken0",
            "type": "u64"
          },
          {
            "name": "fundFeesToken1",
            "type": "u64"
          },
          {
            "name": "openTime",
            "docs": [
              "The timestamp allowed for swap in the pool."
            ],
            "type": "u64"
          },
          {
            "name": "padding",
            "docs": [
              "padding for future updates"
            ],
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "rbaControlList",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "roles",
            "type": {
              "vec": {
                "defined": {
                  "name": "role"
                }
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "role",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roleType",
            "type": {
              "defined": {
                "name": "roleType"
              }
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "roleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "voting"
          },
          {
            "name": "listing"
          },
          {
            "name": "creating"
          }
        ]
      }
    },
    {
      "name": "tokenOption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "token",
            "type": "pubkey"
          },
          {
            "name": "optionType",
            "type": {
              "defined": {
                "name": "optionType"
              }
            }
          },
          {
            "name": "optionValue",
            "type": "string"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tradeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "minimumReceiveAmount",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tradingOverEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "unlockAllTokens",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "votes",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userTokenOptionVotes",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userTokenVotes",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "allUnlocked",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "optionIndex",
            "type": "u32"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "optionValue",
            "type": "string"
          },
          {
            "name": "votes",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voteFinalizedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coopToken",
            "type": "pubkey"
          },
          {
            "name": "memecoin",
            "type": "pubkey"
          },
          {
            "name": "finalName",
            "type": "string"
          },
          {
            "name": "finalSymbol",
            "type": "string"
          },
          {
            "name": "finalUri",
            "type": "string"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
