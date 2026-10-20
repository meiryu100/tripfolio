/** Text helpers for the blog's Markdown: anchors, plain text, reading time and the FAQ section. */

/** "What counts as a **visit**?" → "what-counts-as-a-visit" (anchor id for a heading). */
export function headingId(text: string) {
  return plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Markdown inline syntax removed: **bold** → bold, [text](url) → text. */
export function plainText(markdown: string) {
  return markdown.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1");
}

export function wordCount(markdown: string) {
  return plainText(markdown).split(/\s+/).filter((w) => /\w/.test(w)).length;
}

/** At about 230 words a minute, never less than 1. */
export function readingMinutes(markdown: string) {
  return Math.max(1, Math.round(wordCount(markdown) / 230));
}

/**
 * The questions under a `## FAQ` / `## Frequently asked questions` heading: each `### Question`
 * followed by its answer paragraphs, up to the next `##`. Used for the FAQPage structured data.
 */
export function extractFaq(markdown: string): { question: string; answer: string }[] {
  const section = /^## (?:FAQ|Frequently asked questions)[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/im.exec(markdown);
  if (!section) return [];
  return section[1]
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const [question, ...rest] = chunk.split(/\r?\n/);
      return { question: plainText(question.trim()), answer: plainText(rest.join(" ").replace(/\s+/g, " ").trim()) };
    })
    .filter((qa) => qa.question && qa.answer);
}
