import { TOKEN_DECIMALS } from "./constants";
import { LAB_BANNER, userPreviewNotice } from "./copy";
import { displayToken, toAddress } from "./ids";
import type { ConversionEngine } from "./conversionEngine";
import type { SyntheticPointsLedger } from "./pointsLedger";
import type { SandboxErc20 } from "./token";
import type { WalletView } from "./types";

export class SandboxWallet {
  constructor(
    private readonly points: SyntheticPointsLedger,
    private readonly token: SandboxErc20,
    private readonly conversion: ConversionEngine
  ) {}

  addressFor(userId: string): string {
    return toAddress(userId);
  }

  view(userId: string): WalletView {
    const points = this.points.getBalance(userId);
    const enabled = this.conversion.isConversionEnabled();
    return {
      userId,
      address: this.addressFor(userId),
      pointsAvailable: points.available,
      pointsLocked: points.locked,
      pointsConverted: points.converted,
      tokenBalanceDisplay: displayToken(
        this.token.balanceOf(this.addressFor(userId)),
        TOKEN_DECIMALS
      ),
      conversionActionable: enabled && !this.token.isPaused(),
      banner: userPreviewNotice(enabled),
    };
  }

  banner(): string {
    return LAB_BANNER;
  }
}
