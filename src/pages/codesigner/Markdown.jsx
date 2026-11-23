// Minimal Markdown for Co-designer replies: headings, bullet / numbered
// lists, **bold**, *italic*, `code`, ``` blocks, simple tables and links.
// Built as React nodes (never innerHTML), so model output cannot inject HTML.
import React from 'react'

const LINK = 'text-[#0A2F44] underline dark:text-[#66a4c2]'

function inline(text, key = 'i') {
  const out = []
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g
  let last = 0
  let m
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${n++}`
    if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-[#f1f5f9] px-1 font-mono text-[0.85em] dark:bg-[#0f172a]">{t.slice(1, -1)}</code>)
    else if (t.startsWith('**')) out.push(<strong key={k}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('*')) out.push(<em key={k}>{t.slice(1, -1)}</em>)
    else if (t.startsWith('[')) out.push(<a key={k} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" className={LINK}>{t.slice(1, t.indexOf(']'))}</a>)
    else out.push(<a key={k} href={t} target="_blank" rel="noopener noreferrer nofollow" className={LINK}>{t}</a>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export default function Markdown({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) {
      const body = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++])
      i++
      blocks.push(<pre key={blocks.length} className="overflow-x-auto rounded border border-[#e2e8f0] bg-[#f8fafc] p-3 font-mono text-xs dark:border-[#334155] dark:bg-[#0f172a]">{body.join('\n')}</pre>)
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const cls = h[1].length <= 2 ? 'text-base font-bold' : 'text-sm font-semibold'
      blocks.push(<p key={blocks.length} className={`${cls} text-[#0F172A] dark:text-white`}>{inline(h[2], `h${i}`)}</p>)
      i++
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={blocks.length} className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead><tr>{head.map((c, j) => <th key={j} className="border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-left font-semibold dark:border-[#334155] dark:bg-[#172030]">{inline(c, `th${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border border-[#e2e8f0] px-2 py-1 dark:border-[#334155]">{inline(c, `td${ri}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line)
      const items = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={blocks.length} className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
          {items.map((t, j) => <li key={j}>{inline(t, `li${i}${j}`)}</li>)}
        </List>,
      )
      continue
    }
    if (!line.trim()) { i++; continue }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++])
    if (!para.length) para.push(lines[i++]) // never stall on a line no branch took
    blocks.push(<p key={blocks.length} className="whitespace-pre-line">{inline(para.join('\n'), `p${i}`)}</p>)
  }
  return <div className="space-y-2 break-words text-sm leading-relaxed">{blocks}</div>
}
