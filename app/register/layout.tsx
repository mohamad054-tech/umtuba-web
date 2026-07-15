import { registerMetadata } from "../../lib/site/routeMetadata";

export const metadata = registerMetadata;

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
