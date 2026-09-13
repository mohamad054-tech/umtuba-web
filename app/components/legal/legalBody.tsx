import type { ReactNode } from "react";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`t-${index}`}>{part}</span>;
  });
}

const NUMBERED_LINE = /^(?:\d+|[٠-٩]+)[.)]\s+/;

function isTableBlock(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const tableLines = lines.filter((line) => line.includes("|"));
  return tableLines.length === lines.length && lines.some((line) => /\|[\s:-]+\|/.test(line));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^[\s|:-]+$/.test(line);
}

export function LegalBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="mt-10 space-y-10">
      {blocks.map((block, index) => {
        if (block === "---") {
          return <hr key={`hr-${index}`} className="border-white/10" />;
        }

        if (block.startsWith("# ")) {
          return (
            <h2
              key={`h1-${index}`}
              className="text-2xl font-black tracking-tight text-white sm:text-3xl"
            >
              {renderInline(block.replace(/^#\s+/, "").trim())}
            </h2>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2
              key={`h-${index}`}
              className="text-xl font-black tracking-tight text-white sm:text-2xl"
            >
              {renderInline(block.slice(3).trim())}
            </h2>
          );
        }

        const lines = block.split("\n");

        if (isTableBlock(lines)) {
          const rows = lines.filter((line) => !isSeparatorRow(line)).map(splitRow);
          const header = rows[0] ?? [];
          const bodyRows = rows.slice(1);
          return (
            <div key={`table-${index}`} className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[15px] leading-7 text-white/70">
                <thead>
                  <tr>
                    {header.map((cell, cellIndex) => (
                      <th
                        key={`th-${index}-${cellIndex}`}
                        className="border-b border-white/20 pb-2 pr-4 font-semibold text-white"
                      >
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rowIndex) => (
                    <tr key={`tr-${index}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`td-${index}-${rowIndex}-${cellIndex}`}
                          className="border-b border-white/10 py-2 pr-4 align-top"
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (lines.every((line) => line.trim().startsWith("- "))) {
          return (
            <ul
              key={`ul-${index}`}
              className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70"
            >
              {lines.map((line, lineIndex) => (
                <li key={`li-${index}-${lineIndex}`}>
                  {renderInline(line.replace(/^\s*-\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => NUMBERED_LINE.test(line.trim()))) {
          return (
            <ol
              key={`ol-${index}`}
              className="list-decimal space-y-2 pl-5 text-[15px] leading-7 text-white/70"
            >
              {lines.map((line, lineIndex) => (
                <li key={`oli-${index}-${lineIndex}`}>
                  {renderInline(line.trim().replace(NUMBERED_LINE, ""))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`p-${index}`}
            className="text-[15px] leading-7 text-white/70 whitespace-pre-line"
          >
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
