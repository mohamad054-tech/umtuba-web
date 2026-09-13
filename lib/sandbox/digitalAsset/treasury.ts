import {
  CONVERSION_RATE,
  SANDBOX_TREASURY_ID,
  TOKEN_PRICE,
  TOKEN_SUPPLY,
} from "./constants";
import { TREASURY_COPY } from "./copy";
import { displayToken, toAddress } from "./ids";
import type { SandboxErc20 } from "./token";
import type { TreasuryView } from "./types";

export class SandboxTreasury {
  readonly address: string;

  constructor(private readonly token: SandboxErc20) {
    this.address = toAddress(SANDBOX_TREASURY_ID);
  }

  view(): TreasuryView {
    return {
      treasuryAddress: this.address,
      tokenBalanceDisplay: displayToken(
        this.token.balanceOf(this.address),
        this.token.decimals
      ),
      supplyPolicy: TOKEN_SUPPLY,
      pricePolicy: TOKEN_PRICE,
      conversionRatePolicy: CONVERSION_RATE,
    };
  }

  notice(): string {
    return TREASURY_COPY;
  }
}
