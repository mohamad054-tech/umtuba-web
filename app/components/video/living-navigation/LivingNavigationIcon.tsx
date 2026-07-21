import type { LivingNavigationIconId } from "./livingNavigationConfig";

type LivingNavigationIconProps = {
  icon: LivingNavigationIconId;
  className?: string;
};

export default function LivingNavigationIcon({
  icon,
  className = "h-5 w-5",
}: LivingNavigationIconProps) {
  const common = {
    className,
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  switch (icon) {
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M5 9.5V20h14V9.5M4 4h16l-1.2 5.5a3 3 0 01-4.8 1.8 3 3 0 01-4 0 3 3 0 01-4.8-1.8L4 4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "journey":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3l1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 6.5A2.5 2.5 0 016.5 4H18a2 2 0 012 2v13H6.5A2.5 2.5 0 014 16.5v-10z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M15 10h5v5h-5a2.5 2.5 0 010-5z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "city":
      return (
        <svg {...common}>
          <path d="M4 20V9l6-3v14M10 20V4l10 4v12M2.5 20h19" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M7 12h.01M7 16h.01M14 10h.01M17 11h.01M14 14h.01M17 15h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
}
