/**
 * Near-identical product families for launch diversity caps.
 * Caps live in launchAssumptions.FAMILY_LAUNCH_CAPS — do not raise them to hit 60–80.
 */

import { FAMILY_LAUNCH_CAPS, type LaunchFamily } from "./launchAssumptions";

export function classifyLaunchFamily(title: string): LaunchFamily {
  const t = title.toLowerCase();

  if (
    /\b(wireless charger|usb\b|electric|humidifier|night lamp|automatic pet feeder|smart food dispenser)\b/.test(
      t
    )
  ) {
    return "electric_or_restricted";
  }
  if (/\b(hair dye|hair coloring)\b/.test(t)) return "beauty_chemical";

  if (/\bphone case\b|\bsilicone case\b|mobile phone soft case/.test(t)) {
    return "silicone_phone_case";
  }
  if (
    /\b(earrings?|necklace|pendant)\b/.test(t) &&
    /\b(cube|zircon|rhinestone|crystal)\b/.test(t)
  ) {
    return "cube_jewelry";
  }
  if (/\b(earrings?|necklace|pendant|bracelet)\b/.test(t)) return "other_jewelry";

  if (/\b(ice (cube|tray|ball|maker|mold|hockey)|silicone ice)\b/.test(t)) {
    return "ice_mold_or_tray";
  }

  if (/\bmakeup brush/.test(t)) return "makeup_brush_set";
  if (/\b(toothbrush|teeth brush|baby bottle brush|bottle brush)\b/.test(t)) {
    return "personal_care_brush";
  }
  if (/\bbrush\b/.test(t)) return "cleaning_brush";

  if (/\b(water bowl|drinking|fountain|slow water)\b/.test(t) && /\b(pet|cat|dog)\b/.test(t)) {
    return "pet_water_bowl";
  }
  if (/\b(licking pad|licking mat|placemat|bowl pad|feeder|food dispenser)\b/.test(t)) {
    return "pet_feeding_accessory";
  }
  if (/\b(pet bowl|cat bowl|dog bowl|cat plate|cat basin|dog basin)\b/.test(t)) {
    return "pet_food_bowl";
  }

  if (/\b(car phone holder|car cellphone|vent.*holder|dashboard.*holder|magnetic.*car)\b/.test(t)) {
    return "car_phone_holder";
  }
  if (/\bphone holder\b/.test(t) && /\bcar\b/.test(t)) return "car_phone_holder";
  if (/\b(card holder|desktop.*stand|phone stand|ring buckle)\b/.test(t)) {
    return "phone_stand_or_card_holder";
  }
  if (/\bphone holder\b/.test(t)) return "car_phone_holder";

  if (/\b(cup holder|organizer|anti-slip pad|gap filler)\b/.test(t) && /\bcar\b/.test(t)) {
    return "car_organizer";
  }

  if (/\b(rubik|decompression cube|cube toy)\b/.test(t)) return "novelty_cube_toy";

  if (
    /\b(spatula|lid|matcha|drain|strainer|drainboard|ice cube clamp|kitchen)\b/.test(t)
  ) {
    return "kitchen_gadget";
  }

  if (/\b(aromatherapy|diffuser stone|crystal cube)\b/.test(t)) return "useful_accessory";

  return "useful_accessory";
}

export function familyCap(family: LaunchFamily): number {
  return FAMILY_LAUNCH_CAPS[family];
}

export function isFamilyBlockedFromLaunch(family: LaunchFamily): boolean {
  return FAMILY_LAUNCH_CAPS[family] === 0;
}
