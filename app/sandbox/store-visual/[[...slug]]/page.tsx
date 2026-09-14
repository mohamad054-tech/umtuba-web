import { VisualDemoApp } from "../VisualDemoApp";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ slug?: string[] }>;
  searchParams?: Promise<{ hl?: string }>;
};

export default async function VisualDemoPage({ params, searchParams }: PageProps) {
  const resolved = (await params) ?? {};
  const query = (await searchParams) ?? {};
  const hl = query.hl === "ar" ? "ar" : "en";
  return (
    <div dir={hl === "ar" ? "rtl" : "ltr"} lang={hl}>
      <VisualDemoApp segments={resolved.slug} hl={hl} />
    </div>
  );
}
