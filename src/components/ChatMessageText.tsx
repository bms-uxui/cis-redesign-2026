import { Fragment, type ReactNode } from "react";

/**
 * Lightweight chat text renderer — preserves \n and turns `[label](path)`
 * markdown links into real clickable spans. We don't pull in a full
 * markdown parser because the assistant's output is intentionally narrow:
 * plain Thai prose + bullet points + nav links.
 *
 * Internal links (starting with "/") fire the provided onNavigate callback
 * so the host can navigate + close the drawer in one gesture. External
 * links open in a new tab.
 */

interface ChatMessageTextProps {
  text: string;
  onNavigate?: (path: string) => void;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export default function ChatMessageText({ text, onNavigate }: ChatMessageTextProps) {
  return <>{renderParts(text, onNavigate)}</>;
}

function renderParts(text: string, onNavigate?: (path: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(LINK_PATTERN.source, "g");
  while ((m = re.exec(text)) !== null) {
    const [match, label, href] = m;
    if (m.index > lastIndex) out.push(<Fragment key={`t${key++}`}>{text.slice(lastIndex, m.index)}</Fragment>);
    out.push(renderLink(label, href, key++, onNavigate));
    lastIndex = m.index + match.length;
  }
  if (lastIndex < text.length) out.push(<Fragment key={`t${key++}`}>{text.slice(lastIndex)}</Fragment>);
  return out;
}

function renderLink(
  label: string,
  href: string,
  key: number,
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
