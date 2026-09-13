import { LOCAL_CHAIN_ID, LOCAL_NETWORK_NAME, SANDBOX_MINTER_ID } from "./constants";
import type { SandboxErc20 } from "./token";
import type { ChainFailureMode } from "./types";
import { newLabId } from "./ids";

export type MintAttempt = {
  txId: string;
  ok: boolean;
  reason: "SUCCESS" | "CHAIN_FAILURE" | "UNAUTHORIZED_MINT" | "PAUSED";
};

/**
 * Local in-memory EVM-semantic adapter.
 * Never talks to a public RPC, testnet, or mainnet.
 */
export class LocalChainAdapter {
  readonly network = LOCAL_NETWORK_NAME;
  readonly chainId = LOCAL_CHAIN_ID;
  readonly mainnet = false as const;

  private failureMode: ChainFailureMode = "none";

  constructor(private readonly token: SandboxErc20) {}

  setFailureMode(mode: ChainFailureMode): void {
    this.failureMode = mode;
  }

  mintTo(
    minterId: string,
    to: string,
    value: bigint
  ): MintAttempt {
    const txId = newLabId("tx");
    if (this.failureMode === "always" || this.failureMode === "next_mint") {
      if (this.failureMode === "next_mint") this.failureMode = "none";
      return { txId, ok: false, reason: "CHAIN_FAILURE" };
    }
    if (this.token.isPaused()) {
      return { txId, ok: false, reason: "PAUSED" };
    }
    const minted = this.token.mint(minterId, to, value);
    if (!minted) {
      return {
        txId,
        ok: false,
        reason: this.token.isPaused() ? "PAUSED" : "UNAUTHORIZED_MINT",
      };
    }
    return { txId, ok: true, reason: "SUCCESS" };
  }
}
