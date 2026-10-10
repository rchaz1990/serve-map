import { Fragment, type ReactNode } from 'react'

// Minimal renderer for the verbatim participant documents (### headings, paragraphs,
// "- " and "1. " lists, **bold**). Text is rendered as text — never as HTML.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-white">{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>)
}

export default function SimpleMarkdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/)
  return (
    <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#C0C0C0' }}>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines[0].startsWith('### ')) {
          return <h3 key={i} className="pt-2 text-base font-semibold text-white">{inline(lines[0].slice(4))}</h3>
        }
        if (lines.every(l => /^- /.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>
        }
        if (lines.every(l => /^\d+\. /.test(l))) {
          return <ol key={i} className="list-decimal space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>)}</ol>
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>
      })}
    </div>
  )
}
