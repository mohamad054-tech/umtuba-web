import type { MuteOption } from "../types";

export const MUTE_OPTION_LABELS: Record<MuteOption, string> = {
  "1h": "Mute for 1 hour",
  "8h": "Mute for 8 hours",
  "1w": "Mute for 1 week",
  forever: "Mute until I turn it back on",
  off: "Unmute",
};

export const MUTE_OPTIONS: MuteOption[] = ["1h", "8h", "1w", "forever", "off"];

export function isMuteOption(value: string): value is MuteOption {
  return (MUTE_OPTIONS as readonly string[]).includes(value);
}

export function muteOptionToRpcValue(option: MuteOption): string {
  return option;
}
