/**
 * LOCAL reference token — EIP-20 interface + OpenZeppelin-class
 * AccessControl / Pausable / mint / burn. In-memory only.
 * SOURCE: https://eips.ethereum.org/EIPS/eip-20
 * SOURCE: https://docs.openzeppelin.com/contracts/5.x/erc20
 * DATE_RETRIEVED: 2026-08-18
 */

import {
  ROLE_BURNER,
  ROLE_MINTER,
  ROLE_PAUSER,
  TOKEN_DECIMALS,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  ZERO_ADDRESS,
} from "./constants";
import type { LabAuditTrail } from "./audit";
import type { LabAccessControl } from "./roles";
import type { TokenEvent } from "./types";
import { newLabId, nowIso } from "./ids";

export class SandboxErc20 {
  readonly name = TOKEN_NAME;
  readonly symbol = TOKEN_SYMBOL;
  readonly decimals = TOKEN_DECIMALS;

  private paused = false;
  private total = BigInt(0);
  private readonly balances = new Map<string, bigint>();
  private readonly allowances = new Map<string, bigint>();
  private readonly events: TokenEvent[] = [];

  constructor(
    private readonly access: LabAccessControl,
    private readonly audit: LabAuditTrail
  ) {}

  isPaused(): boolean {
    return this.paused;
  }

  pause(actorId: string): boolean {
    if (!this.access.has(actorId, ROLE_PAUSER)) return false;
    this.paused = true;
    this.audit.record(actorId, "token.pause");
    return true;
  }

  unpause(actorId: string): boolean {
    if (!this.access.has(actorId, ROLE_PAUSER)) return false;
    this.paused = false;
    this.audit.record(actorId, "token.unpause");
    return true;
  }

  totalSupply(): bigint {
    return this.total;
  }

  balanceOf(owner: string): bigint {
    return this.balances.get(owner) ?? BigInt(0);
  }

  allowance(owner: string, spender: string): bigint {
    return this.allowances.get(this.allowKey(owner, spender)) ?? BigInt(0);
  }

  approve(owner: string, spender: string, value: bigint): boolean {
    if (this.paused) return false;
    if (!owner || !spender || value < BigInt(0)) return false;
    this.allowances.set(this.allowKey(owner, spender), value);
    this.pushEvent("Approval", owner, spender, value, spender);
    return true;
  }

  transfer(from: string, to: string, value: bigint): boolean {
    if (this.paused) return false;
    return this.move(from, to, value);
  }

  transferFrom(
    spender: string,
    from: string,
    to: string,
    value: bigint
  ): boolean {
    if (this.paused) return false;
    const allowed = this.allowance(from, spender);
    if (allowed < value) return false;
    if (!this.move(from, to, value)) return false;
    this.allowances.set(this.allowKey(from, spender), allowed - value);
    return true;
  }

  mint(actorId: string, to: string, value: bigint): boolean {
    if (!this.access.has(actorId, ROLE_MINTER)) {
      this.audit.record(actorId, "token.mint.denied", { to }, "warn");
      return false;
    }
    if (this.paused || !to || value <= BigInt(0)) return false;
    this.balances.set(to, this.balanceOf(to) + value);
    this.total += value;
    this.pushEvent("Transfer", ZERO_ADDRESS, to, value);
    this.audit.record(actorId, "token.mint", {
      to,
      value: value.toString(),
    });
    return true;
  }

  burn(actorId: string, from: string, value: bigint): boolean {
    if (!this.access.has(actorId, ROLE_BURNER)) return false;
    if (this.paused || value <= BigInt(0)) return false;
    const current = this.balanceOf(from);
    if (current < value) return false;
    this.balances.set(from, current - value);
    this.total -= value;
    this.pushEvent("Transfer", from, ZERO_ADDRESS, value);
    this.audit.record(actorId, "token.burn", {
      from,
      value: value.toString(),
    });
    return true;
  }

  listEvents(): TokenEvent[] {
    return this.events.map((e) => ({ ...e }));
  }

  private move(from: string, to: string, value: bigint): boolean {
    if (!from || !to || value < BigInt(0)) return false;
    if (from === to && value === BigInt(0)) {
      this.pushEvent("Transfer", from, to, value);
      return true;
    }
    const current = this.balanceOf(from);
    if (current < value) return false;
    this.balances.set(from, current - value);
    this.balances.set(to, this.balanceOf(to) + value);
    this.pushEvent("Transfer", from, to, value);
    return true;
  }

  private allowKey(owner: string, spender: string): string {
    return `${owner}::${spender}`;
  }

  private pushEvent(
    kind: TokenEvent["kind"],
    from: string,
    to: string,
    value: bigint,
    spender?: string
  ): void {
    this.events.push({
      eventId: newLabId("evt"),
      kind,
      from,
      to,
      value,
      spender,
      createdAt: nowIso(),
    });
  }
}
