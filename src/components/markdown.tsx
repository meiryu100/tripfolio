import Link from "next/link";
import type { ReactNode } from "react";
import { headingId } from "@/lib/blog-text";

/**
 * Renders the small Markdown subset the blog posts use: `##` / `###` headings (with anchor ids),
 * paragraphs, `-` and `1.` lists, **bold** and [links](url). No raw HTML is ever passed through.
 */

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={m.index}>{m[1]}</strong>);
    } else if (m[3].startsWith("/") && !m[3].startsWith("//")) {
      out.push(
        <Link key={m.index} href={m[3]}>
          {m[2]}
        </Link>,
      );
    } else if (/^https:\/\//.test(m[3])) {
      out.push(
        <a key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer">
          {m[2]}
        </a>,
      );
    } else {
      out.push(m[2]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const ORDERED = /^\d+\.\s/;

export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\r?\n\s*\r?\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const text = block.trim();
        if (text.startsWith("### ")) {
          return (
            <h3 key={i} id={headingId(text.slice(4))} className="mt-3 scroll-mt-24 text-xl font-bold tracking-tight text-fg">
              {inline(text.slice(4))}
            </h3>
          );
        }
        if (text.startsWith("## ")) {
          return (
            <h2 key={i} id={headingId(text.slice(3))} className="mt-6 scroll-mt-24 text-2xl font-bold tracking-tight text-fg">
              {inline(text.slice(3))}
            </h2>
          );
        }
        const lines = text.split(/\r?\n/);
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => ORDERED.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(ORDERED, ""))}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </>
  );
}
