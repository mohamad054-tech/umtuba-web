import type { ReactNode } from "react";

type StorePageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export default function StorePageHeader({
  eyebrow,
  title,
  description,
  children,
}: StorePageHeaderProps) {
  return (
    <header className="sf-page-header mt-6">
      <p className="sf-eyebrow">{eyebrow}</p>
      <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h1>
      {description ? <p className="sf-page-header__lede">{description}</p> : null}
      {children}
    </header>
  );
}
