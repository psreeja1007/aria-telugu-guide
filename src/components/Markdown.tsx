import { Fragment, type ReactNode } from "react";

/** Tiny, safe renderer for the little formatting Aria uses: paragraphs, lists, **bold**. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="list-decimal space-y-1 ps-6">{items}</ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 ps-6">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    const ul = line.match(/^[-*•]\s+(.*)$/);
    if (!line) {
      flushPara();
      flushList();
    } else if (ol || ul) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ol ?? ul)![1]);
    } else {
      flushList();
      para.push(line.replace(/^#+\s*/, ""));
    }
  }
  flushPara();
  flushList();
  return <div className="space-y-2">{blocks}</div>;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
      <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{p.replace(/\*\*/g, "")}</Fragment>
    ),
  );
}
