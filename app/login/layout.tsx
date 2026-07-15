import { loginMetadata } from "../../lib/site/routeMetadata";

export const metadata = loginMetadata;

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
