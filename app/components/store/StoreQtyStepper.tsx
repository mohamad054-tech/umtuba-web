"use client";

type StoreQtyStepperProps = {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  label: string;
  onChange: (next: number) => void;
};

export default function StoreQtyStepper({
  value,
  min = 1,
  max,
  disabled,
  label,
  onChange,
}: StoreQtyStepperProps) {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);

  return (
    <div className="sf-qty" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= lo}
        onClick={() => onChange(Math.max(lo, value - 1))}
        className="watch-focus-ring"
      >
        −
      </button>
      <span className="sf-qty__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= hi}
        onClick={() => onChange(Math.min(hi, value + 1))}
        className="watch-focus-ring"
      >
        +
      </button>
    </div>
  );
}
