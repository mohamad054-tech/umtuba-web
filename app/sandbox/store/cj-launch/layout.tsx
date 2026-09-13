import type { ReactNode } from "react";
import CjLaunchPreviewFrame from "./CjLaunchPreviewFrame";

export const metadata = {
  title: "CJ Draft Store (SANDBOX) | UMTUBA",
  robots: { index: false, follow: false },
};

export default function CjLaunchSandboxLayout({ children }: { children: ReactNode }) {
  return <CjLaunchPreviewFrame>{children}</CjLaunchPreviewFrame>;
}
