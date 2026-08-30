"use client";

import { useMemo } from "react";
import { renderContactQrSvg } from "../../../lib/comms/qrSvg";

type PersonalQrCardProps = {
  url: string;
  label: string;
};

export default function PersonalQrCard({ url, label }: PersonalQrCardProps) {
  const svg = useMemo(() => renderContactQrSvg(url, { size: 208 }), [url]);

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-3xl border border-white/10 bg-white p-3 shadow-[0_0_40px_rgba(56,189,248,0.12)]"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200/80">
        {label}
      </figcaption>
    </figure>
  );
}
