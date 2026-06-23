import { Fragment, type ReactNode } from "react";

/**
 * Lightweight chat markdown renderer — enough for Mae's replies without
 * pulling in a full markdown engine. Supports:
 *   - paragraphs (blank-line separated) and single line breaks
 *   - bullet lists (`-`, `*`, `•`) and numbered lists (`1.`, `2)`)
 *   - GFM tables (header row + `|---|` separator) for labs / vitals / meds
 *   - blockquotes (`>`) for clinical warnings (⚠️ renders as-is)
 *   - inline **bold**, *italic* / _italic_, `code`
 *   - `[label](path)` links — internal ("/") fire onNavigate, external open a tab
 */

interface ChatMessageTextProps {
  text: string;
  onNavigate?: (path: string) => void;
}

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
/** A table separator like `|---|:--:|` (the 2nd line of a GFM table). */
const TABLE_SEP_RE = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

export default function ChatMessageText({ text, onNavigate }: ChatMessageTextProps) {
  return <div className="space-y-2">{renderBlocks(text, onNavigate)}</div>;
}

// ── Block layer: paragraphs + lists ─────────────────────────────────────────

function renderBlocks(text: string, onNavigate?: (p: string) => void): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={`p${key++}`} className="whitespace-pre-wrap leading-relaxed">
        {para.map((ln, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(ln, onNavigate, `p${key}-${i}`)}
          </Fragment>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="leading-relaxed">
        {renderInline(it, onNavigate, `l${key}-${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`o${key++}`} className="list-decimal space-y-1 pl-5">{items}</ol>
      ) : (
        <ul key={`u${key++}`} className="list-disc space-y-1 pl-5">{items}</ul>
      ),
    );
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const bullet = raw.match(BULLET_RE);
    const ordered = raw.match(ORDERED_RE);
    const quote = raw.match(QUOTE_RE);

    // GFM table: a `|`-bearing header line immediately followed by a
    // `|---|` separator. Consume the whole table block.
    if (raw.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      flushPara();
      flushList();
      const header = splitRow(raw);
      const rows: string[][] = [];
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // step back; the for-loop will advance
      blocks.push(renderTable(header, rows, key++, onNavigate));
      continue;
    }

    if (bullet) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
    } else if (ordered) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ordered[1]);
    } else if (quote) {
      flushPara();
      flushList();
      // Merge consecutive quote lines into one blockquote.
      const quoteLines = [quote[1]];
      while (i + 1 < lines.length && QUOTE_RE.test(lines[i + 1])) {
        quoteLines.push(lines[++i].match(QUOTE_RE)![1]);
      }
      blocks.push(
        <blockquote
          key={`q${key++}`}
          className="border-l-4 border-[var(--theme-warning,#d97706)]/60 bg-[var(--theme-warning,#d97706)]/8 rounded-r-md py-1.5 pl-3 pr-2 text-[var(--theme-neutral)]/90"
        >
          {quoteLines.map((ln, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderInline(ln, onNavigate, `q${key}-${j}`)}
            </Fragment>
          ))}
        </blockquote>,
      );
    } else if (raw.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(raw);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function renderTable(
  header: string[],
  rows: string[][],
  key: number,
  onNavigate?: (p: string) => void,
): ReactNode {
  return (
    <div key={`tbl${key}`} className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-[0.92em]">
        <thead>
          <tr className="border-b border-[var(--theme-neutral)]/20">
            {header.map((h, i) => (
              <th key={i} className="px-2 py-1 text-left font-semibold align-top">
                {renderInline(h, onNavigate, `th${key}-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-[var(--theme-neutral)]/10 last:border-0">
              {header.map((_, ci) => (
                <td key={ci} className="px-2 py-1 align-top">
                  {renderInline(r[ci] ?? "", onNavigate, `td${key}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Inline layer: bold / italic / code / links ──────────────────────────────

const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*\n]+)\*)|(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

function renderInline(text: string, onNavigate?: (p: string) => void, prefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE_RE.source, "g");
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={`${prefix}t${key++}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] || m[3]) {
      const inner = m[2] ?? m[4];
      out.push(<strong key={`${prefix}b${key++}`} className="font-semibold">{renderInline(inner, onNavigate, `${prefix}b${key}`)}</strong>);
    } else if (m[5]) {
      out.push(<em key={`${prefix}i${key++}`}>{renderInline(m[6], onNavigate, `${prefix}i${key}`)}</em>);
    } else if (m[7] !== undefined) {
      out.push(<em key={`${prefix}u${key++}`}>{renderInline(m[7], onNavigate, `${prefix}u${key}`)}</em>);
    } else if (m[8]) {
      out.push(
        <code key={`${prefix}c${key++}`} className="rounded bg-[var(--theme-neutral)]/10 px-1 py-0.5 font-mono text-[0.85em]">
          {m[9]}
        </code>,
      );
    } else if (m[10]) {
      out.push(renderLink(m[11], m[12], `${prefix}lnk${key++}`, onNavigate));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={`${prefix}t${key++}`}>{text.slice(last)}</Fragment>);
  return out;
}

function renderLink(
  label: string,
  href: string,
  key: string,
  onNavigate?: (path: string) => void,
): ReactNode {
  const isInternal = href.startsWith("/");
  if (isInternal) {
    return (
      <button
        key={key}
        type="button"
        onClick={() => onNavigate?.(href)}
        className="inline rounded px-1 -mx-0.5 font-medium text-[var(--theme-primary)] underline decoration-[var(--theme-primary)]/40 underline-offset-2 hover:bg-[var(--theme-primary-soft)] hover:decoration-[var(--theme-primary)]"
      >
        {label}
      </button>
    );
  }
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[var(--theme-primary)] underline decoration-[var(--theme-primary)]/40 underline-offset-2 hover:decoration-[var(--theme-primary)]"
    >
      {label}
    </a>
  );
}
