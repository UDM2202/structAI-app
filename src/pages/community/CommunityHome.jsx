// /community -- discussions, the shared-designs gallery, the feed of people
// you follow and your activity. Data: the accounts server (/api/community/).
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiSearch, FiPlus, FiMessageSquare, FiCheckCircle, FiShield, FiUsers, FiLayers, FiBell, FiAlertTriangle } from 'react-icons/fi'
import AccountLayout from '../../components/layout/AccountLayout'
import Dropdown from '../../components/Dropdown'
import { communityApi } from '../../services/accountsApi'
import { ELEMENTS } from '../../utils/savedDesigns'
import { Panel, Btn, TextInput, Empty, Notice } from '../org/orgUi'
import { KindBadge, TagChip, AuthorLine, Avatar } from './communityUi'
import { STATUS_CLS, timeAgo, useCommunityMe } from './community'

const TABS = [
  { key: 'posts', label: 'Discussions', icon: FiMessageSquare },
  { key: 'designs', label: 'Shared designs', icon: FiLayers },
  { key: 'following', label: 'Following', icon: FiUsers },
  { key: 'activity', label: 'Activity', icon: FiBell },
]
const SORTS = [
  { value: 'new', label: 'Newest' },
  { value: 'active', label: 'Recently active' },
  { value: 'top', label: 'Most upvoted' },
  { value: 'unanswered', label: 'Unanswered questions' },
]
const KINDS = [
  { value: 'posts', label: 'Questions & discussions' },
  { value: 'question', label: 'Questions' },
  { value: 'discussion', label: 'Discussions' },
]

export default function CommunityHome() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'posts'
  const tag = params.get('tag') || ''
  const [me] = useCommunityMe()
  const [tags, setTags] = useState([])

  useEffect(() => { communityApi.tags().then(setTags).catch(() => setTags([])) }, [])

  const set = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
    setParams(next, { replace: true })
  }

  return (
    <AccountLayout title="Community" subtitle="Ask, answer and share designs with other engineers">
      <div className="space-y-4 p-4 sm:p-8">
        {me?.is_banned && (
          <Notice tone="error">Your community account is suspended{me.banned_reason ? `: ${me.banned_reason}` : ''}. You can read, but not post, reply or vote.</Notice>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Community sections" className="flex flex-wrap gap-1 border-b border-[#e2e8f0] dark:border-[#334155]">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                onClick={() => set({ tab: t.key === 'posts' ? '' : t.key, sort: '', kind: '', q: '', element: '' })}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${tab === t.key
                  ? 'border-[#0A2F44] text-[#0A2F44] dark:border-[#66a4c2] dark:text-[#66a4c2]'
                  : 'border-transparent text-[#64748b] hover:text-[#0F172A] dark:text-[#94a3b8] dark:hover:text-white'}`}>
                <t.icon /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {me?.is_moderator && (
              <Link to="/community/moderation">
                <Btn size="sm"><FiShield /> Moderation{me.open_reports ? ` · ${me.open_reports}` : ''}</Btn>
              </Link>
            )}
            {!me?.is_banned && (
              <>
                <Link to="/community/new?kind=design"><Btn size="sm"><FiLayers /> Share a design</Btn></Link>
                <Link to="/community/new"><Btn variant="primary" size="sm"><FiPlus /> New post</Btn></Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0">
            {tab === 'activity' ? <ActivityList />
              : <PostList key={`${tab}:${tag}`}tab={tab} params={params} set={set} tags={tags} />}
          </div>
          <aside className="space-y-4">
            <Panel index="T" title="Topics" bodyClass="p-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <TagChip key={t.slug} tag={t} active={tag === t.slug}
                    onClick={() => set({ tag: tag === t.slug ? '' : t.slug, tab: tab === 'activity' ? '' : params.get('tab') })} />
                ))}
              </div>
            </Panel>
            <PeoplePanel />
            <Panel index="i" title="House rules" bodyClass="p-3 text-xs leading-relaxed text-[#475569] dark:text-[#94a3b8]">
              <ul className="list-disc space-y-1 pl-4">
                <li>Answers here are peer opinions, not checked designs. The engineer of record stays responsible.</li>
                <li>Do not post client names, drawings or project data you may not share.</li>
                <li>Be specific: code clause, element, loads and what you already tried.</li>
                <li>Use <strong>Report</strong> on anything spammy, abusive or unsafe.</li>
              </ul>
            </Panel>
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}

function PostList({ tab, params, set, tags }) {
  const designs = tab === 'designs'
  const sort = params.get('sort') || (designs ? 'new' : 'active')
  const kind = params.get('kind') || 'posts'
  const element = params.get('element') || ''
  const tag = params.get('tag') || ''
  const [q, setQ] = useState(params.get('q') || '')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const query = useMemo(() => ({
    kind: designs ? 'design' : kind,
    sort: designs && sort === 'unanswered' ? 'new' : sort,
    tag, element: designs ? element : '', q: params.get('q') || '',
    feed: tab === 'following' ? 'following' : '', page,
  }), [designs, kind, sort, tag, element, params, tab, page])

  useEffect(() => {
    let live = true
    communityApi.posts(query)
      .then((d) => { if (live) { setData(d); setError('') } })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [query])

  const tagName = tags.find((t) => t.slug === tag)?.name
  const loading = !data && !error
  const elementOpts = [{ value: '', label: 'All elements' }, ...Object.entries(ELEMENTS).map(([k, v]) => ({ value: k, label: v.label }))]

  return (
    <Panel index={designs ? '02' : tab === 'following' ? '03' : '01'}
      title={`${designs ? 'Shared designs' : tab === 'following' ? 'From people you follow' : 'Discussions'}${data ? ` · ${data.count}` : ''}${tagName ? ` · ${tagName}` : ''}`}
      bodyClass="">
      <form className="grid grid-cols-1 gap-2 border-b border-[#e2e8f0] p-3 dark:border-[#334155] md:grid-cols-[1fr_13rem_12rem]"
        onSubmit={(e) => { e.preventDefault(); setPage(1); set({ q: q.trim() }) }}>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={designs ? 'Search shared designs' : 'Search titles and posts'} className="pl-9" aria-label="Search the community" />
        </div>
        {designs
          ? <Dropdown value={element} onChange={(v) => { setPage(1); set({ element: v }) }} options={elementOpts} />
          : <Dropdown value={kind} onChange={(v) => { setPage(1); set({ kind: v === 'posts' ? '' : v }) }} options={KINDS} />}
        <Dropdown value={sort} onChange={(v) => { setPage(1); set({ sort: v }) }} options={designs ? SORTS.slice(0, 3) : SORTS} />
      </form>

      {error && <div className="p-3"><Notice tone="error">{error}</Notice></div>}
      {loading && <Empty>Loading…</Empty>}
      {data && data.results.length === 0 && (
        <div className="px-4 py-10 text-center">
          <Empty>{tab === 'following' ? 'Nothing yet from people you follow' : 'Nothing here yet'}</Empty>
          {tab === 'following'
            ? <p className="text-xs text-[#64748b]">Follow engineers from their profile to see their posts and designs here.</p>
            : <Link to={designs ? '/community/new?kind=design' : '/community/new'}><Btn variant="primary">{designs ? 'Share the first design' : 'Start the first discussion'}</Btn></Link>}
        </div>
      )}
      {data && data.results.length > 0 && (
        <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
          {data.results.map((p) => <PostRow key={p.id} post={p} />)}
        </ul>
      )}
      {data && (data.next || data.previous) && (
        <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-2 dark:border-[#334155]">
          <Btn size="sm" disabled={!data.previous} onClick={() => setPage((n) => n - 1)}>Previous</Btn>
          <span className="font-mono text-xs text-[#64748b]">Page {page} of {Math.max(1, Math.ceil(data.count / 20))}</span>
          <Btn size="sm" disabled={!data.next} onClick={() => setPage((n) => n + 1)}>Next</Btn>
        </div>
      )}
    </Panel>
  )
}

function PostRow({ post }) {
  const d = post.design
  return (
    <li className="flex gap-3 px-4 py-3">
      <div className="flex w-14 flex-shrink-0 flex-col items-center gap-1 pt-0.5 font-mono text-[11px] text-[#64748b] dark:text-[#94a3b8]">
        <span title="Upvotes"><strong className="text-sm text-[#0F172A] dark:text-white">{post.vote_count}</strong> up</span>
        <span title={post.kind === 'question' ? 'Answers' : 'Replies'} className={`rounded px-1 ${post.is_answered ? 'bg-emerald-600 text-white' : ''}`}>
          {post.is_answered && <FiCheckCircle className="mr-0.5 inline" />}{post.comment_count} {post.kind === 'question' ? 'ans' : 're'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <KindBadge kind={post.kind} />
          {post.is_hidden && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-red-600"><FiAlertTriangle /> Hidden by a moderator</span>}
          {d && <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">{ELEMENTS[d.element]?.label || d.element}</span>}
          {d?.status && <span className={`font-mono text-[10px] font-semibold ${STATUS_CLS[d.status] || ''}`}>{d.status}</span>}
        </div>
        <Link to={`/community/posts/${post.id}`} className="block text-sm font-semibold text-[#0F172A] hover:underline dark:text-white">{post.title}</Link>
        {d?.subtitle && <p className="font-mono text-xs text-[#64748b]">{d.subtitle}</p>}
        {post.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-[#475569] dark:text-[#94a3b8]">{post.excerpt}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AuthorLine person={post.author} at={post.created_at} />
          {post.tags.map((t) => <TagChip key={t.slug} tag={t} />)}
        </div>
      </div>
    </li>
  )
}

const ACTIVITY_TEXT = {
  answer: 'answered your question',
  comment: 'replied to your post',
  reply: 'replied to your comment on',
  accepted: 'accepted your answer to',
  follow: 'started following you',
  hidden: 'A moderator hid your post',
}

function ActivityList() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { communityApi.activity().then(setItems).catch((e) => setError(e.message)) }, [])
  return (
    <Panel index="04" title="Activity · last 90 days" bodyClass="">
      {error && <div className="p-3"><Notice tone="error">{error}</Notice></div>}
      {!items && !error && <Empty>Loading…</Empty>}
      {items?.length === 0 && <Empty>No activity yet: replies, answers and new followers appear here</Empty>}
      {items?.length > 0 && (
        <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
              {it.actor ? <Avatar person={it.actor} size="sm" /> : <FiAlertTriangle className="mt-0.5 text-red-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-[#334155] dark:text-[#cbd5e1]">
                  {it.actor && <Link to={`/community/u/${encodeURIComponent(it.actor.username)}`} className="font-semibold text-[#0F172A] hover:underline dark:text-white">{it.actor.display_name}</Link>}
                  {' '}{ACTIVITY_TEXT[it.type]}{' '}
                  {it.post_id && <Link to={`/community/posts/${it.post_id}`} className="font-medium text-[#0A2F44] hover:underline dark:text-[#66a4c2]">{it.post_title}</Link>}
                </p>
                {it.text && <p className="mt-0.5 line-clamp-2 text-xs text-[#64748b]">{it.type === 'hidden' ? `Reason: ${it.text}` : it.text}</p>}
              </div>
              <time className="flex-shrink-0 font-mono text-[11px] text-[#94a3b8]" dateTime={it.created_at}>{timeAgo(it.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function PeoplePanel() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  useEffect(() => {
    const t = setTimeout(() => { communityApi.people(q.trim()).then(setPeople).catch(() => setPeople([])) }, 250)
    return () => clearTimeout(t)
  }, [q])
  return (
    <Panel index="P" title="Engineers" bodyClass="p-3 space-y-2">
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by name, company, title" aria-label="Find engineers" />
      <ul className="space-y-1">
        {people.slice(0, 8).map((p) => (
          <li key={p.username}>
            <button type="button" onClick={() => navigate(`/community/u/${encodeURIComponent(p.username)}`)}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-[#f1f5f9] dark:hover:bg-[#334155]">
              <Avatar person={p} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-[#0F172A] dark:text-white">{p.display_name}</span>
                {p.headline && <span className="block truncate text-[11px] text-[#64748b]">{p.headline}</span>}
              </span>
            </button>
          </li>
        ))}
        {!people.length && <li className="text-xs text-[#94a3b8]">No one found</li>}
      </ul>
    </Panel>
  )
}
