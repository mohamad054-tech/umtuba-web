export function availableUnits(input: {
  onHand: number;
  reserved: number;
  safetyStock: number;
}): number {
  const sellable = input.onHand - input.reserved - input.safetyStock;
  return sellable > 0 ? sellable : 0;
}

export function validateInventoryInput(input: {
  onHand?: unknown;
  reserved?: unknown;
  safetyStock?: unknown;
  allowBackorder?: unknown;
  warehouseKey?: unknown;
}):
  | {
      ok: true;
      onHand: number;
      reserved: number;
      safetyStock: number;
      allowBackorder: boolean;
      warehouseKey: string;
    }
  | { ok: false; message: string } {
  const onHand = parseNonNegInt(input.onHand, "On hand");
  if (!onHand.ok) return onHand;
  const reserved = parseNonNegInt(input.reserved ?? 0, "Reserved");
  if (!reserved.ok) return reserved;
  const safetyStock = parseNonNegInt(input.safetyStock ?? 0, "Safety stock");
  if (!safetyStock.ok) return safetyStock;

  if (reserved.value > onHand.value) {
    return { ok: false, message: "Reserved cannot exceed on-hand quantity." };
  }

  const warehouseKey =
    typeof input.warehouseKey === "string" && input.warehouseKey.trim()
      ? input.warehouseKey.trim().toLowerCase()
      : "default";
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(warehouseKey)) {
    return { ok: false, message: "Warehouse key is invalid." };
  }

  return {
    ok: true,
    onHand: onHand.value,
    reserved: reserved.value,
    safetyStock: safetyStock.value,
    allowBackorder: Boolean(input.allowBackorder),
    warehouseKey,
  };
}

function parseNonNegInt(
  value: unknown,
  label: string
): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof value === "string" && value.trim() !== "") {
    if (!/^\d+$/.test(value.trim())) {
      return { ok: false, message: `${label} must be a whole number.` };
    }
    value = Number(value.trim());
  }
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, message: `${label} must be a whole number.` };
  }
  if (value < 0) {
    return { ok: false, message: `${label} cannot be negative.` };
  }
  return { ok: true, value };
}
