import { signupMetadata } from "../../lib/site/routeMetadata";

export const metadata = signupMetadata;

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
