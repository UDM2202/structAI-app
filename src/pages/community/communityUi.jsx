// Shared pieces for the Community pages (same look as the organisation pages:
// thin rules, numbered panels, mono labels).
import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowUp, FiShield } from 'react-icons/fi'
import { KIND, timeAgo } from './community'

export function KindBadge({ kind }) {
  const k = KIND[kind] || KIND.discussion
  const Icon = k.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${k.cls}`}>
      <Icon className="text-[11px]" /> {k.label}
    </span>
  )
}

export function TagChip({ tag, active, onClick }) {
  const cls = `inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${active
    ? 'border-[#0A2F44] bg-[#0A2F44] text-white dark:border-[#66a4c2] dark:bg-[#66a4c2] dark:text-[#0b1620]'
    : 'border-[#cbd5e1] text-[#475569] hover:border-[#0A2F44] hover:text-[#0A2F44] dark:border-[#475569] dark:text-[#94a3b8] dark:hover:border-[#66a4c2] dark:hover:text-[#66a4c2]'}`
  if (onClick) return <button type="button" onClick={onClick} className={cls} aria-pressed={!!active}>{tag.name}</button>
  return <Link to={`/community?tag=${tag.slug}`} className={cls}>{tag.name}</Link>
}

export function Avatar({ person, size = 'md' }) {
  const sz = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-9 w-9 text-xs'
  const name = person?.display_name || person?.username || '?'
  if (person?.avatar) return <img src={person.avatar} alt="" className={`${sz} flex-shrink-0 rounded-full object-cover`} />
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span aria-hidden="true" className={`${sz} inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#0A2F44] font-semibold text-white dark:bg-[#66a4c2] dark:text-[#0b1620]`}>
      {letters}
    </span>
  )
}

export function AuthorLine({ person, at, edited, size = 'sm' }) {
  if (!person) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-[#64748b] dark:text-[#94a3b8]">
      <Avatar person={person} size={size} />
      <Link to={`/community/u/${encodeURIComponent(person.username)}`} className="truncate font-medium text-[#0F172A] hover:underline dark:text-white">
        {person.display_name}
      </Link>
      {person.is_moderator && <span title="Community moderator" className="text-amber-600 dark:text-amber-400"><FiShield /></span>}
      {at && <time dateTime={at} title={new Date(at).toLocaleString('en-GB')} className="font-mono">{timeAgo(at)}{edited ? ' · edited' : ''}</time>}
    </span>
  )
}

export function VoteButton({ count, voted, disabled, onToggle, label = 'Upvote' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={!!voted}
      aria-label={`${label} (${count})`}
      title={disabled ? 'You cannot vote for your own' : voted ? 'Remove your vote' : label}
      className={`inline-flex min-w-[3rem] flex-shrink-0 flex-col items-center self-start rounded border px-2 py-1 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${voted
        ? 'border-[#0A2F44] bg-[#0A2F44] text-white dark:border-[#66a4c2] dark:bg-[#66a4c2] dark:text-[#0b1620]'
        : 'border-[#cbd5e1] text-[#475569] hover:border-[#0A2F44] dark:border-[#475569] dark:text-[#94a3b8] dark:hover:border-[#66a4c2]'}`}
    >
      <FiArrowUp />
      <span className="font-semibold">{count}</span>
    </button>
  )
}

// Post / reply text: plain text with paragraphs, `inline code`, ``` blocks
// and bare links. Rendered as React nodes (never as HTML).
export function RichText({ text, className = '' }) {
  const blocks = String(text || '').split(/```/)
  return (
    <div className={`space-y-3 break-words text-sm leading-relaxed text-[#334155] dark:text-[#cbd5e1] ${className}`}>
      {blocks.map((block, i) => (i % 2 === 1
        ? <pre key={i} className="overflow-x-auto rounded border border-[#e2e8f0] bg-[#f8fafc] p-3 font-mono text-xs dark:border-[#334155] dark:bg-[#0f172a]">{block.replace(/^\w*\n/, '')}</pre>
        : block.split(/\n{2,}/).filter((p) => p.trim()).map((para, j) => (
          <p key={`${i}-${j}`} className="whitespace-pre-line">{inline(para)}</p>
        ))))}
    </div>
  )
}

function inline(text) {
  return text.split(/(`[^`\n]+`|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className="rounded bg-[#f1f5f9] px-1 font-mono text-[0.85em] dark:bg-[#0f172a]">{part.slice(1, -1)}</code>
    }
    if (/^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-[#0A2F44] underline dark:text-[#66a4c2]">{part}</a>
    }
    return part
  })
}
