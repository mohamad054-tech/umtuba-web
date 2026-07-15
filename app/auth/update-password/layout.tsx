import { updatePasswordMetadata } from "../../../lib/site/routeMetadata";

export const metadata = updatePasswordMetadata;

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
