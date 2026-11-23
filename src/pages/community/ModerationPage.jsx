// /community/moderation -- moderators only: open reports (hide the item or
// dismiss the report) and the log of moderator actions. Moderators are staff
// accounts or members of the "community_moderators" group (Django admin).
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiEyeOff, FiCheck } from 'react-icons/fi'
import AccountLayout from '../../components/layout/AccountLayout'
import { communityApi } from '../../services/accountsApi'
import { Panel, Btn, TextInput, Notice, Empty, Th } from '../org/orgUi'
import { AuthorLine } from './communityUi'
import { REPORT_REASONS, timeAgo, useCommunityMe } from './community'

const reasonLabel = (r) => REPORT_REASONS.find((x) => x.value === r)?.label || r
const STATUSES = ['open', 'actioned', 'dismissed']

export default function ModerationPage() {
  const [me] = useCommunityMe()
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState(null)
  const [log, setLog] = useState([])
  const [notes, setNotes] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(() => {
    communityApi.reports(status).then((d) => setReports(d.results)).catch((e) => setError(e.message))
    communityApi.modLog().then(setLog).catch(() => {})
  }, [status])
  useEffect(() => { load() }, [load])

  const resolve = async (r, action) => {
    try { await communityApi.resolveReport(r.id, action, notes[r.id] || ''); load() } catch (e) { setError(e.message) }
  }

  if (me && !me.is_moderator) {
    return (
      <AccountLayout title="Moderation" subtitle="Community">
        <div className="p-4 sm:p-8"><Notice tone="error">Only community moderators can open this page.</Notice></div>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout title="Moderation" subtitle="Community reports and actions">
      <div className="space-y-4 p-4 sm:p-8">
        <Link to="/community" className="inline-flex items-center gap-1 text-sm text-[#0A2F44] hover:underline dark:text-[#66a4c2]"><FiArrowLeft /> Community</Link>
        {error && <Notice tone="error">{error}</Notice>}
        <Panel index="01" title={`Reports · ${status}`} bodyClass=""
          actions={<div className="flex gap-1">{STATUSES.map((s) => (
            <Btn key={s} size="sm" variant={s === status ? 'primary' : 'secondary'} onClick={() => { setReports(null); setStatus(s) }}>{s}</Btn>
          ))}</div>}>
          {!reports && <Empty>Loading…</Empty>}
          {reports?.length === 0 && <Empty>{status === 'open' ? 'No open reports' : 'None'}</Empty>}
          <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
            {reports?.map((r) => (
              <li key={r.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded border border-red-300 px-1.5 py-0.5 font-mono uppercase text-red-700 dark:border-red-500/50 dark:text-red-400">{reasonLabel(r.reason)}</span>
                  <span className="text-[#64748b]">reported by</span> <AuthorLine person={r.reporter} at={r.created_at} />
                </div>
                <div className="rounded border border-[#e2e8f0] p-3 dark:border-[#334155]">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                    {r.target.type === 'post' ? 'Post' : 'Reply on'}{' '}
                    <Link to={`/community/posts/${r.target.post_id}`} className="normal-case text-[#0A2F44] hover:underline dark:text-[#66a4c2]">{r.target.title}</Link>
                    {r.target.is_hidden && <span className="ml-2 text-red-600">hidden</span>}
                  </p>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-[#334155] dark:text-[#cbd5e1]">{r.target.text || '(no text)'}</p>
                  <div className="mt-1"><AuthorLine person={r.target.author} /></div>
                </div>
                {r.details && <p className="text-xs text-[#475569] dark:text-[#94a3b8]">Reporter: “{r.details}”</p>}
                {r.status === 'open' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <TextInput value={notes[r.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Note / reason shown to the author if hidden" className="max-w-md" aria-label="Moderator note" />
                    <Btn size="sm" variant="danger" onClick={() => resolve(r, 'hide')}><FiEyeOff /> Hide item</Btn>
                    <Btn size="sm" onClick={() => resolve(r, 'dismiss')}><FiCheck /> Dismiss</Btn>
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-[#64748b]">{r.status} by {r.resolved_by} {r.resolved_at && timeAgo(r.resolved_at)}{r.resolution_note ? ` · ${r.resolution_note}` : ''}</p>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel index="02" title="Moderation log · last 100" bodyClass="overflow-x-auto">
          {log.length === 0 ? <Empty>No actions yet</Empty> : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] dark:border-[#334155] dark:bg-[#172030]"><tr><Th>When</Th><Th>Moderator</Th><Th>Action</Th><Th>Target</Th><Th>Note</Th></tr></thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {log.map((a, i) => (
                  <tr key={i} className="text-[#334155] dark:text-[#cbd5e1]">
                    <td className="px-4 py-2 font-mono text-xs">{timeAgo(a.created_at)}</td>
                    <td className="px-4 py-2">{a.moderator}</td>
                    <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                    <td className="px-4 py-2 font-mono text-xs">{a.target_type} {a.target_id}</td>
                    <td className="px-4 py-2 text-xs">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </AccountLayout>
  )
}
