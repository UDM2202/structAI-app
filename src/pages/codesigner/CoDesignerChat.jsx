// The Co-designer chat (API apps/co_designer), used full-page at /co-designer
// and, compact, in the design hub's side panel (MainLayout).
// Ask: explanations and advice. Design: the Co-designer runs designs with the
// SDH engine (and can create organisations / projects on the server); each
// design it ran comes back with the reply and opens on the app's results page
// or saves to the user's designs. A saved design can be attached so the
// Co-designer continues from it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSend, FiTrash2, FiEdit2, FiPaperclip, FiX, FiExternalLink, FiSave, FiMessageCircle, FiTool, FiAlertTriangle, FiCpu } from 'react-icons/fi'
import Dropdown from '../../components/Dropdown'
import { useAuth } from '../../contexts/AuthContext'
import { coDesignerApi } from '../../services/accountsApi'
import { listAllDesigns, saveDesign, ELEMENTS } from '../../utils/savedDesigns'
import { Btn, Notice, Modal, TextInput, Empty } from '../org/orgUi'
import Markdown from './Markdown'
import { designKind, designStatus, designRouterState, designContext, EXAMPLES } from './codesigner'

const MAX_PROMPT = 10000
const POLL_MS = 1500
const POLL_LIMIT_MS = 4 * 60 * 1000
const STATUS_CLS = { PASS: 'text-emerald-600 dark:text-emerald-400', FAIL: 'text-red-600 dark:text-red-400' }

// activeId: open conversation (null = new); onOpen(id) changes it.
export default function CoDesignerChat({ activeId, onOpen, compact = false }) {
  const [list, setList] = useState(null)
  const [convo, setConvo] = useState(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null) // { text } while a job runs
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const bottom = useRef(null)

  const loadList = useCallback(() => coDesignerApi.conversations().then(setList).catch((e) => setError(e.message)), [])
  useEffect(() => { Promise.resolve().then(loadList) }, [loadList])

  const loadConvo = useCallback(async (id) => {
    if (!id) { setConvo(null); return }
    try { setConvo(await coDesignerApi.conversation(id)) }
    catch (e) { setError(e.status === 404 ? 'That conversation no longer exists.' : e.message); setConvo(null) }
  }, [])
  useEffect(() => { Promise.resolve().then(() => loadConvo(activeId)) }, [activeId, loadConvo])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [convo, pending])

  const open = (id) => { setError(''); onOpen(id) }

  // Send, then wait for the job (the server may answer at once or run it in
  // the background), then reload the conversation.
  const send = async ({ text, mode, target }) => {
    setError('')
    setPending({ text })
    try {
      const start = await coDesignerApi.chat({
        message: text, prompt_type: mode, task_target: mode === 'task' ? target : null, conversation_id: activeId,
      })
      const t0 = Date.now()
      for (;;) {
        const job = await coDesignerApi.job(start.job_id)
        if (job.status === 'completed' || job.status === 'failed') break
        if (Date.now() - t0 > POLL_LIMIT_MS) throw new Error('The Co-designer is taking too long. Its reply will appear in this conversation when it finishes.')
        await new Promise((r) => setTimeout(r, POLL_MS))
      }
      if (start.conversation_id !== activeId) open(start.conversation_id)
      else await loadConvo(start.conversation_id)
      loadList()
      return true
    } catch (e) {
      if (e.status === 409) setError('This conversation is full. Start a new conversation to continue.')
      else setError(e.message)
      return false
    } finally {
      setPending(null)
    }
  }

  const usage = convo?.conversation_usage
  const messages = (convo?.messages || []).filter((m) => m.role === 'user' || m.role === 'assistant')

  return (
    <>
      <div className={compact ? 'flex h-full min-h-0 flex-col' : 'grid min-h-[calc(100vh-81px)] grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[17rem_1fr] lg:grid-rows-1'}>
        {/* conversations: a dropdown in the panel, a list on the page */}
        {compact ? (
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-white p-2 dark:border-[#334155] dark:bg-[#1f2937]">
            <div className="min-w-0 flex-1">
              <Dropdown value={activeId ? String(activeId) : ''} onChange={(v) => open(v ? Number(v) : null)}
                options={[{ value: '', label: 'New conversation' }, ...(list || []).map((c) => ({ value: String(c.id), label: c.title }))]} />
            </div>
            <Btn size="sm" onClick={() => open(null)} title="New conversation" aria-label="New conversation"><FiPlus /></Btn>
            {activeId && <Btn size="sm" variant="ghost" title="Delete conversation" aria-label="Delete conversation" onClick={() => setDeleting(list?.find((c) => c.id === activeId) || { id: activeId, title: 'this conversation' })}><FiTrash2 /></Btn>}
          </div>
        ) : (
        <aside className="border-b border-[#e2e8f0] bg-white dark:border-[#334155] dark:bg-[#1f2937] lg:border-b-0 lg:border-r">
          <div className="p-3">
            <Btn variant="primary" className="w-full" onClick={() => open(null)}><FiPlus /> New conversation</Btn>
          </div>
          <nav aria-label="Conversations" className="max-h-56 overflow-y-auto px-2 pb-3 lg:max-h-[calc(100vh-150px)]">
            {list === null && <Empty>Loading…</Empty>}
            {list?.length === 0 && <p className="px-2 py-3 text-xs text-[#94a3b8]">No conversations yet.</p>}
            {list?.map((c) => (
              <div key={c.id} className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${c.id === activeId ? 'bg-[#f0f7fb] dark:bg-[#132b3a]' : 'hover:bg-[#f1f5f9] dark:hover:bg-[#334155]'}`}>
                <button type="button" onClick={() => open(c.id)} aria-current={c.id === activeId ? 'page' : undefined}
                  className="min-w-0 flex-1 truncate text-left text-[#0F172A] dark:text-white">{c.title}</button>
                <button type="button" aria-label={`Rename ${c.title}`} onClick={() => setRenaming(c)} className="rounded p-1 text-[#94a3b8] opacity-60 hover:text-[#0F172A] group-hover:opacity-100 dark:hover:text-white"><FiEdit2 size={13} /></button>
                <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)} className="rounded p-1 text-[#94a3b8] opacity-60 hover:text-red-600 group-hover:opacity-100"><FiTrash2 size={13} /></button>
              </div>
            ))}
          </nav>
        </aside>
        )}

        {/* thread */}
        <section className={`flex min-w-0 flex-col bg-[#f8fafc] dark:bg-[#111827] ${compact ? 'min-h-0 flex-1' : ''}`}>
          <div className={`flex-1 space-y-4 overflow-y-auto ${compact ? 'p-3' : 'p-4 sm:p-6'}`}>
            {!activeId && !pending && <Intro compact={compact} onPick={(text, mode) => send({ text, mode, target: { target_layer: 'user' } })} />}
            {activeId && !convo && !error && <Empty>Loading…</Empty>}
            {messages.map((m) => <Message key={m.id} m={m} />)}
            {pending && (
              <>
                <Bubble role="user"><p className="whitespace-pre-line">{pending.text}</p></Bubble>
                <Bubble role="assistant"><span role="status" className="inline-flex items-center gap-2 text-[#64748b]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#0A2F44] dark:bg-[#66a4c2]" /> Working on it…</span></Bubble>
              </>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <div ref={bottom} />
          </div>
          {usage && (
            <div className="px-4 sm:px-6">
              <div className="flex items-center gap-2 text-[11px] text-[#64748b]" title={`${usage.used.toLocaleString('en-GB')} of ${usage.limit.toLocaleString('en-GB')} characters`}>
                <span className="font-mono">Conversation {usage.percentage}% full</span>
                <div className="h-1 flex-1 overflow-hidden rounded bg-[#e2e8f0] dark:bg-[#334155]">
                  <div className={`h-full ${usage.warning ? 'bg-amber-500' : 'bg-[#0A2F44] dark:bg-[#66a4c2]'}`} style={{ width: `${Math.min(100, usage.percentage)}%` }} />
                </div>
                {usage.warning && <span className="text-amber-600">Start a new conversation soon</span>}
              </div>
            </div>
          )}
          <Composer busy={!!pending} onSend={send} />
        </section>
      </div>

      {renaming && <RenameModal c={renaming} onClose={() => setRenaming(null)} onDone={() => { setRenaming(null); loadList(); loadConvo(activeId) }} />}
      {deleting && (
        <Modal title="Delete conversation" onClose={() => setDeleting(null)}
          footer={<><Btn onClick={() => setDeleting(null)}>Cancel</Btn><Btn variant="danger" onClick={async () => {
            try { await coDesignerApi.remove(deleting.id) } catch (e) { setError(e.message) }
            if (deleting.id === activeId) open(null)
            setDeleting(null); loadList()
          }}>Delete</Btn></>}>
          <p>Delete “{deleting.title}”? Designs you saved from it stay in your designs.</p>
        </Modal>
      )}
    </>
  )
}

function Intro({ onPick, compact }) {
  return (
    <div className={`mx-auto max-w-2xl space-y-5 ${compact ? 'py-2' : 'py-6'}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A2F44] text-white dark:bg-[#66a4c2] dark:text-[#0b1620]"><FiCpu size={20} /></span>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Co-designer</h2>
          <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">An AI assistant for EC2 design. Numbers come from the Sphere Design Hub engine; the explanations come from the AI and can be wrong.</p>
        </div>
      </div>
      {[['question', 'Ask', FiMessageCircle], ['task', 'Let it design', FiTool]].map(([mode, label, icon]) => { const Icon = icon; return (
        <div key={mode}>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569] dark:text-[#94a3b8]"><Icon /> {label}</p>
          <div className={`grid grid-cols-1 gap-2 ${compact ? '' : 'sm:grid-cols-3'}`}>
            {EXAMPLES[mode].map((t) => (
              <button key={t} type="button" onClick={() => onPick(t, mode)}
                className="rounded-md border border-[#e2e8f0] bg-white p-3 text-left text-sm text-[#334155] hover:border-[#0A2F44] dark:border-[#334155] dark:bg-[#1f2937] dark:text-[#cbd5e1] dark:hover:border-[#66a4c2]">{t}</button>
            ))}
          </div>
        </div>
      ) })}
    </div>
  )
}

function Bubble({ role, error, children }) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[min(48rem,100%)] rounded-lg px-4 py-3 text-sm ${mine
        ? 'bg-[#0A2F44] text-white dark:bg-[#1e3a4a]'
        : error ? 'border border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200'
          : 'border border-[#e2e8f0] bg-white text-[#334155] dark:border-[#334155] dark:bg-[#1f2937] dark:text-[#cbd5e1]'}`}>
        {children}
      </div>
    </div>
  )
}

function Message({ m }) {
  if (m.role === 'user') {
    const [first, ...rest] = m.content.split('\n\n---\n')
    return (
      <Bubble role="user">
        <p className="whitespace-pre-line">{first}</p>
        {rest.length > 0 && <p className="mt-2 border-t border-white/20 pt-2 text-xs text-white/70"><FiPaperclip className="mr-1 inline" />A design was attached</p>}
      </Bubble>
    )
  }
  const md = m.metadata || {}
  return (
    <Bubble role="assistant" error={md.error}>
      {md.error && <p className="mb-1 flex items-center gap-1 text-xs font-semibold"><FiAlertTriangle /> The Co-designer could not finish</p>}
      <Markdown text={m.content || '(no text)'} />
      {(md.designs || []).length > 0 && (
        <div className="mt-3 space-y-2">{md.designs.map((d, i) => <DesignCard key={i} d={d} sourceKey={`${m.id}:${i}`} />)}</div>
      )}
    </Bubble>
  )
}

// sourceKey (reply id : position) identifies the design, so a design that is
// already in the user's saved designs shows "Saved" after a reload too.
const isSaved = (sourceKey) => listAllDesigns().some((x) => x.source?.codesigner === sourceKey)

function DesignCard({ d, sourceKey }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => isSaved(sourceKey))
  const [err, setErr] = useState('')
  const kind = designKind(d)
  const status = designStatus(d.result)
  if (!kind) return <p className="text-xs text-[#94a3b8]">A {d.member_type} design ran, but the app has no page for it.</p>
  const name = d.name || `${kind.label} (Co-designer)`
  const save = () => {
    try {
      // no project_id: inside a project's design hub it is saved to that project (saveDesign), else as a quick design
      if (!isSaved(sourceKey)) {
        saveDesign(kind.element, { name, status, subtitle: 'From the Co-designer', route: kind.route, state: designRouterState(d), source: { codesigner: sourceKey } })
      }
      setSaved(true)
    } catch (e) { setErr(e.message) }
  }
  return (
    <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 dark:border-[#334155] dark:bg-[#172030]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
            {kind.label}{status && <span className={`ml-2 font-semibold ${STATUS_CLS[status]}`}>{status}</span>}
            <span className="ml-2">{d.saved ? 'saved on the server' : 'trial run'}</span>
          </p>
          <p className="truncate text-sm font-semibold text-[#0F172A] dark:text-white">{name}</p>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => navigate(kind.route, { state: designRouterState(d) })}><FiExternalLink /> Open report</Btn>
          <Btn size="sm" variant="primary" onClick={save} disabled={saved}><FiSave /> {saved ? 'Saved' : 'Save to my designs'}</Btn>
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  )
}

function Composer({ busy, onSend }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [mode, setMode] = useState('question')
  const [targets, setTargets] = useState(null)
  const [target, setTarget] = useState('user')
  const [attach, setAttach] = useState('')
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (mode !== 'task' || targets) return
    coDesignerApi.targets().then(setTargets).catch(() => setTargets({ organizations: [], projects: [], results: [] }))
  }, [mode, targets])

  const myDesigns = useMemo(() => listAllDesigns().filter((d) => !d.owner_id || d.owner_id === user?.id), [user])
  const attached = myDesigns.find((d) => `${d.element}:${d.id}` === attach)

  const targetOpts = [
    { value: 'user', label: 'My workspace' },
    ...(targets?.projects || []).map((p) => ({ value: `project:${p.id}`, label: `Project · ${p.name}` })),
    ...(targets?.results || []).map((r) => ({ value: `result:${r.id}`, label: `Server design · ${r.name}` })),
    ...(targets?.organizations || []).map((o) => ({ value: `organisation:${o.id}`, label: `Organisation · ${o.name}` })),
  ]
  const targetObj = () => {
    if (target === 'user') return { target_layer: 'user' }
    const [layer, id] = target.split(':')
    const n = Number(id)
    if (layer === 'project') {
      const p = targets.projects.find((x) => x.id === n)
      return { target_layer: 'project', project_id: n, organization_id: p?.organization?.id ?? null }
    }
    if (layer === 'result') {
      const r = targets.results.find((x) => x.id === n)
      return { target_layer: 'result', result_id: n, project_id: r?.project?.id ?? null, organization_id: r?.organization?.id ?? r?.project?.organization?.id ?? null }
    }
    return { target_layer: 'organisation', organization_id: n }
  }

  const full = attached ? `${text.trim()}\n\n---\n${designContext(attached, ELEMENTS[attached.element]?.label || attached.element)}` : text.trim()
  const tooLong = full.length > MAX_PROMPT

  const submit = async (e) => {
    e?.preventDefault()
    if (!text.trim() || busy || tooLong) return
    const ok = await onSend({ text: full, mode, target: mode === 'task' ? targetObj() : null })
    if (ok) { setText(''); setAttach('') }
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-[#e2e8f0] bg-white p-3 dark:border-[#334155] dark:bg-[#1f2937] sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Mode" className="inline-flex rounded border border-[#cbd5e1] p-0.5 dark:border-[#475569]">
          {[['question', 'Ask', FiMessageCircle], ['task', 'Design', FiTool]].map(([k, label, icon]) => { const Icon = icon; return (
            <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium ${mode === k ? 'bg-[#0A2F44] text-white dark:bg-[#66a4c2] dark:text-[#0b1620]' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
              <Icon /> {label}
            </button>
          ) })}
        </div>
        {mode === 'task' && (
          <div className="w-64 max-w-full"><Dropdown value={target} onChange={setTarget} options={targetOpts} /></div>
        )}
        <Btn size="sm" variant="ghost" onClick={() => setPicking(true)} title="Attach one of your saved designs"><FiPaperclip /> Attach a design</Btn>
        {attached && (
          <span className="inline-flex items-center gap-1 rounded border border-[#cbd5e1] px-2 py-0.5 text-xs dark:border-[#475569]">
            {attached.name} <button type="button" aria-label="Remove attachment" onClick={() => setAttach('')}><FiX /></button>
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
          rows={2}
          maxLength={MAX_PROMPT}
          aria-label="Message the Co-designer"
          placeholder={mode === 'task' ? 'Describe the element: span, section, loads, grades… (Enter to send)' : 'Ask about a clause, a check or a result… (Enter to send, Shift+Enter for a new line)'}
          className="min-h-[2.75rem] flex-1 resize-y rounded border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94a3b8] focus:border-[#0A2F44] focus:outline-none dark:border-[#475569] dark:bg-[#0f172a] dark:text-white"
        />
        <Btn type="submit" variant="primary" disabled={busy || !text.trim() || tooLong} aria-label="Send"><FiSend /></Btn>
      </div>
      <p className={`text-[11px] ${tooLong ? 'text-red-600' : 'text-[#94a3b8]'}`}>
        {tooLong ? `Too long with the attached design (${full.length.toLocaleString('en-GB')} / ${MAX_PROMPT.toLocaleString('en-GB')} characters).`
          : mode === 'task' ? 'Design mode can run designs and, when asked, create projects or organisations on the server. Check every result before use.'
            : 'AI answers can be wrong. Check them against the code before relying on them.'}
      </p>
      {picking && (
        <Modal title="Attach a saved design" onClose={() => setPicking(false)}>
          {myDesigns.length === 0 ? <p>You have no saved designs yet.</p> : (
            <ul className="max-h-80 divide-y divide-[#e2e8f0] overflow-y-auto dark:divide-[#334155]">
              {myDesigns.map((d) => (
                <li key={`${d.element}:${d.id}`}>
                  <button type="button" onClick={() => { setAttach(`${d.element}:${d.id}`); setPicking(false) }}
                    className="flex w-full items-center justify-between gap-2 px-1 py-2 text-left hover:bg-[#f1f5f9] dark:hover:bg-[#334155]">
                    <span className="min-w-0 truncate">{d.name || 'Untitled'}</span>
                    <span className="flex-shrink-0 font-mono text-[10px] uppercase text-[#64748b]">{ELEMENTS[d.element]?.label} {d.status && <span className={STATUS_CLS[d.status]}>{d.status}</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[#64748b]">The design's main inputs and results are added to your message so the Co-designer can continue from it.</p>
        </Modal>
      )}
    </form>
  )
}

function RenameModal({ c, onClose, onDone }) {
  const [title, setTitle] = useState(c.title)
  const [err, setErr] = useState('')
  const save = async () => {
    try { await coDesignerApi.rename(c.id, title); onDone() } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title="Rename conversation" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={!title.trim()}>Save</Btn></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} autoFocus aria-label="Conversation title" />
    </Modal>
  )
}
