import { notFound } from "next/navigation";
import LiveMediaLabClient from "./LiveMediaLabClient";

export default function LiveMediaLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#070712]">
      <LiveMediaLabClient />
    </main>
  );
}
