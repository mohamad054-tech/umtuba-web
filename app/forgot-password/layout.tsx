import { forgotPasswordMetadata } from "../../lib/site/routeMetadata";

export const metadata = forgotPasswordMetadata;

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
