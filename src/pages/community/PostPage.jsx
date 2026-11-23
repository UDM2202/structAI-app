// /community/posts/:id -- a post, its replies (one level of nesting), votes,
// accepted answer, the shared design (open the full report / copy it into
// Quick Design), reporting and moderator actions.
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheckCircle, FiCornerDownRight, FiEdit2, FiTrash2, FiFlag, FiEyeOff, FiEye, FiExternalLink, FiCopy, FiSlash } from 'react-icons/fi'
import AccountLayout from '../../components/layout/AccountLayout'
import Dropdown from '../../components/Dropdown'
import { communityApi } from '../../services/accountsApi'
import { saveDesign, ELEMENTS } from '../../utils/savedDesigns'
import { Panel, Btn, TextArea, TextInput, Field, Notice, Modal, Empty } from '../org/orgUi'
import { KindBadge, TagChip, AuthorLine, VoteButton, RichText } from './communityUi'
import { REPORT_REASONS, STATUS_CLS, useCommunityMe } from './community'

export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [me] = useCommunityMe()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // {type:'report'|'hide'|'ban'|'delete', target}

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([communityApi.post(id), communityApi.comments(id)])
      setPost(p); setComments(c); setError('')
    } catch (e) { setError(e.status === 404 ? 'This post does not exist, was deleted, or was hidden by a moderator.' : e.message) }
  }, [id])
  // first load in a callback (the lint rule flags a direct call)
  useEffect(() => { Promise.resolve().then(load) }, [load])

  const act = async (fn, okMsg) => {
    setFlash('')
    try { await fn(); if (okMsg) setFlash(okMsg); await load() } catch (e) { setError(e.message) }
  }

  if (error && !post) {
    return (
      <AccountLayout title="Community" subtitle="Post">
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
          <Notice tone="error">{error}</Notice>
          <Link to="/community"><Btn>Back to the Community</Btn></Link>
        </div>
      </AccountLayout>
    )
  }
  if (!post) return <AccountLayout title="Community" subtitle="Post"><Empty>Loading…</Empty></AccountLayout>

  const canWrite = !me?.is_banned
  const top = comments.filter((c) => !c.parent)
  const repliesOf = (cid) => comments.filter((c) => c.parent === cid)
  const accepted = top.find((c) => c.is_accepted)
  const ordered = accepted ? [accepted, ...top.filter((c) => c !== accepted)] : top
  const isQuestion = post.kind === 'question'

  const sendReply = async (e) => {
    e.preventDefault()
    setBusy(true)
    try { await communityApi.addComment(post.id, reply); setReply(''); await load() }
    catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <AccountLayout title="Community" subtitle={post.title}>
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
        <Link to="/community" className="inline-flex items-center gap-1 text-sm text-[#0A2F44] hover:underline dark:text-[#66a4c2]">
          <FiArrowLeft /> Community
        </Link>
        {error && <Notice tone="error">{error}</Notice>}
        {flash && <Notice tone="ok">{flash}</Notice>}
        {post.is_hidden && (
          <Notice tone="warn">
            Hidden by a moderator{post.hidden_reason ? `: ${post.hidden_reason}` : ''}. Only you{post.can_moderate ? ', the author' : ''} and moderators can see it; no new replies.
          </Notice>
        )}

        <Panel index={isQuestion ? 'Q' : post.kind === 'design' ? 'D' : 'T'} title={<KindBadge kind={post.kind} />} bodyClass="p-4">
          <div className="flex gap-4">
            <VoteButton count={post.vote_count} voted={post.has_voted} disabled={post.can_edit || !canWrite}
              onToggle={() => act(() => communityApi.votePost(post.id, !post.has_voted))} />
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">{post.title}</h1>
              <AuthorLine person={post.author} at={post.created_at} edited={!!post.edited_at} size="md" />
              {post.design && <DesignCard post={post} onCopied={setFlash} onError={setError} />}
              {post.body ? <RichText text={post.body} /> : null}
              {post.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{post.tags.map((t) => <TagChip key={t.slug} tag={t} />)}</div>}
              <div className="flex flex-wrap gap-2 border-t border-[#e2e8f0] pt-3 dark:border-[#334155]">
                {post.can_edit && <Link to={`/community/posts/${post.id}/edit`}><Btn size="sm" variant="ghost"><FiEdit2 /> Edit</Btn></Link>}
                {(post.can_edit || post.can_moderate) && <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'delete', target: { post: post.id } })}><FiTrash2 /> Delete</Btn>}
                {!post.can_edit && <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'report', target: { post: post.id } })}><FiFlag /> Report</Btn>}
                {post.can_moderate && (post.is_hidden
                  ? <Btn size="sm" variant="ghost" onClick={() => act(() => communityApi.moderate('post', post.id, 'unhide'), 'Post visible again.')}><FiEye /> Unhide</Btn>
                  : <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'hide', target: { type: 'post', id: post.id } })}><FiEyeOff /> Hide</Btn>)}
                {post.can_moderate && !post.can_edit && !post.author.is_moderator && (
                  <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'ban', target: post.author })}><FiSlash /> Suspend author</Btn>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <Panel index={String(top.length).padStart(2, '0')} title={isQuestion ? 'Answers' : 'Replies'} bodyClass="">
          {top.length === 0 && <Empty>{isQuestion ? 'No answers yet' : 'No replies yet'}</Empty>}
          <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
            {ordered.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <CommentItem c={c} post={post} me={me} canWrite={canWrite} act={act} setModal={setModal} reload={load} setError={setError} />
                {repliesOf(c.id).length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-[#e2e8f0] pl-4 dark:border-[#334155]">
                    {repliesOf(c.id).map((r) => (
                      <li key={r.id}><CommentItem c={r} post={post} me={me} canWrite={canWrite} act={act} setModal={setModal} reload={load} setError={setError} nested /></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {canWrite && !post.is_hidden && (
            <form onSubmit={sendReply} className="space-y-2 border-t border-[#e2e8f0] p-4 dark:border-[#334155]">
              <Field label={isQuestion ? 'Your answer' : 'Your reply'} hint="Cite the clause or source you rely on. Peer advice, not a checked design.">
                <TextArea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={10000} />
              </Field>
              <div className="flex justify-end">
                <Btn type="submit" variant="primary" disabled={busy || reply.trim().length < 2}>{busy ? 'Posting…' : isQuestion ? 'Post answer' : 'Post reply'}</Btn>
              </div>
            </form>
          )}
        </Panel>
      </div>

      {modal && (
        <ActionModal modal={modal} onClose={() => setModal(null)}
          onDone={async (msg, goHome) => { setModal(null); if (goHome) { navigate('/community', { replace: true }); return } setFlash(msg); await load() }}
          onError={(m) => { setModal(null); setError(m) }} />
      )}
    </AccountLayout>
  )
}

function CommentItem({ c, post, me, canWrite, act, setModal, reload, setError, nested }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(c.body)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const isQuestion = post.kind === 'question'

  const saveEdit = async () => {
    try { await communityApi.editComment(c.id, text); setEditing(false); await reload() } catch (e) { setError(e.message) }
  }
  const sendReply = async () => {
    try { await communityApi.addComment(post.id, replyText, c.id); setReplyText(''); setReplying(false); await reload() } catch (e) { setError(e.message) }
  }

  return (
    <div className="flex gap-3">
      {!nested && (
        <VoteButton count={c.vote_count} voted={c.has_voted} disabled={c.can_edit || !canWrite || c.is_hidden}
          onToggle={() => act(() => communityApi.voteComment(c.id, !c.has_voted))} />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <AuthorLine person={c.author} at={c.created_at} edited={!!c.edited_at} />
          {c.is_accepted && <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-white"><FiCheckCircle /> Accepted answer</span>}
          {c.is_hidden && <span className="font-mono text-[10px] uppercase text-red-600">Hidden{c.hidden_reason ? `: ${c.hidden_reason}` : ''}</span>}
        </div>
        {editing ? (
          <div className="space-y-2">
            <TextArea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} aria-label="Edit reply" />
            <div className="flex gap-2"><Btn size="sm" variant="primary" onClick={saveEdit} disabled={text.trim().length < 2}>Save</Btn><Btn size="sm" onClick={() => { setEditing(false); setText(c.body) }}>Cancel</Btn></div>
          </div>
        ) : c.is_hidden && !c.body ? (
          <p className="text-xs italic text-[#94a3b8]">This reply was hidden by a moderator.</p>
        ) : <RichText text={c.body} />}
        <div className="flex flex-wrap gap-1">
          {canWrite && !post.is_hidden && !c.is_hidden && <Btn size="sm" variant="ghost" onClick={() => setReplying((r) => !r)}><FiCornerDownRight /> Reply</Btn>}
          {isQuestion && post.can_edit && !nested && !c.is_hidden && (
            <Btn size="sm" variant="ghost" onClick={() => act(() => communityApi.accept(post.id, c.is_accepted ? null : c.id), c.is_accepted ? 'Answer no longer accepted.' : 'Answer accepted.')}>
              <FiCheckCircle /> {c.is_accepted ? 'Unaccept' : 'Accept answer'}
            </Btn>
          )}
          {c.can_edit && !editing && <Btn size="sm" variant="ghost" onClick={() => setEditing(true)}><FiEdit2 /> Edit</Btn>}
          {(c.can_edit || me?.is_moderator) && <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'delete', target: { comment: c.id } })}><FiTrash2 /> Delete</Btn>}
          {!c.can_edit && !c.is_hidden && <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'report', target: { comment: c.id } })}><FiFlag /> Report</Btn>}
          {me?.is_moderator && (c.is_hidden
            ? <Btn size="sm" variant="ghost" onClick={() => act(() => communityApi.moderate('comment', c.id, 'unhide'), 'Reply visible again.')}><FiEye /> Unhide</Btn>
            : <Btn size="sm" variant="ghost" onClick={() => setModal({ type: 'hide', target: { type: 'comment', id: c.id } })}><FiEyeOff /> Hide</Btn>)}
        </div>
        {replying && (
          <div className="space-y-2">
            <TextArea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={10000} aria-label="Reply" autoFocus />
            <div className="flex gap-2"><Btn size="sm" variant="primary" onClick={sendReply} disabled={replyText.trim().length < 2}>Reply</Btn><Btn size="sm" onClick={() => setReplying(false)}>Cancel</Btn></div>
          </div>
        )}
      </div>
    </div>
  )
}

// The shared design: open its results page (read the full report) or copy it
// into the viewer's Quick Design list.
function DesignCard({ post, onCopied, onError }) {
  const navigate = useNavigate()
  const d = post.design
  const [busy, setBusy] = useState('')
  const fetchFull = async () => communityApi.design(d.uuid)

  const open = async () => {
    setBusy('open')
    try {
      const full = await fetchFull()
      // savedDesignId: opened from a published copy, so leaving does not ask to save
      navigate(full.route, { state: { ...full.state, savedDesignId: `community:${d.uuid}` } })
    } catch (e) { onError(e.message); setBusy('') }
  }
  const copy = async () => {
    setBusy('copy')
    try {
      const full = await fetchFull()
      saveDesign(full.element, {
        name: `${full.name} (from @${full.owner.username})`, status: full.status, subtitle: full.subtitle,
        route: full.route, state: full.state, project_id: null,
        source: { community_post: post.id, uuid: d.uuid, author: full.owner.username },
      })
      onCopied('Copied to your Quick Design list (Saved Designs). It is your copy: re-run it with your own inputs before relying on it.')
    } catch (e) { onError(e.message) }
    setBusy('')
  }

  return (
    <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 dark:border-[#334155] dark:bg-[#172030]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">{ELEMENTS[d.element]?.label || d.element}
            {d.status && <span className={`ml-2 font-semibold ${STATUS_CLS[d.status] || ''}`}>{d.status}</span>}</p>
          <p className="truncate text-sm font-semibold text-[#0F172A] dark:text-white">{d.name}</p>
          {d.subtitle && <p className="text-xs text-[#64748b]">{d.subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={open} disabled={!!busy}><FiExternalLink /> {busy === 'open' ? 'Opening…' : 'Open report'}</Btn>
          <Btn size="sm" variant="primary" onClick={copy} disabled={!!busy}><FiCopy /> {busy === 'copy' ? 'Copying…' : 'Copy to my designs'}</Btn>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#64748b]">Published by the author as it was saved. Not checked by Sphere Design Hub or the community.</p>
    </div>
  )
}

function ActionModal({ modal, onClose, onDone, onError }) {
  const [reason, setReason] = useState(modal.type === 'report' ? 'spam' : '')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const t = modal.target

  const run = async () => {
    setBusy(true)
    try {
      if (modal.type === 'report') {
        const r = await communityApi.report(t, reason, details)
        onDone(r?.detail || 'Reported. A moderator will look at it.')
      } else if (modal.type === 'hide') {
        await communityApi.moderate(t.type, t.id, 'hide', reason)
        onDone('Hidden. The author sees your reason.')
      } else if (modal.type === 'ban') {
        await communityApi.moderateUser(t.username, 'ban', reason)
        onDone(`${t.display_name} is suspended: they can read but not post, reply or vote.`)
      } else if (modal.type === 'delete') {
        if (t.post) { await communityApi.deletePost(t.post); onDone('', true) }
        else { await communityApi.deleteComment(t.comment); onDone('Deleted.') }
      }
    } catch (e) { onError(e.message) }
  }

  const titles = { report: 'Report', hide: 'Hide (moderator)', ban: `Suspend ${t.display_name || ''}`, delete: 'Delete' }
  const needsReason = modal.type === 'hide' || modal.type === 'ban'
  return (
    <Modal title={titles[modal.type]} onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant={modal.type === 'report' ? 'primary' : 'danger'} onClick={run} disabled={busy || (needsReason && reason.trim().length < 3)}>
          {modal.type === 'report' ? 'Send report' : modal.type === 'delete' ? 'Delete' : modal.type === 'ban' ? 'Suspend' : 'Hide'}
        </Btn>
      </>}>
      {modal.type === 'report' && (
        <>
          <Field label="Reason"><Dropdown value={reason} onChange={setReason} options={REPORT_REASONS} /></Field>
          <Field label="Details (optional)" hint="Only moderators see this."><TextArea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} /></Field>
        </>
      )}
      {needsReason && (
        <Field label="Reason" hint={modal.type === 'hide' ? 'Shown to the author.' : 'Recorded in the moderation log.'}>
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus />
        </Field>
      )}
      {modal.type === 'delete' && <p>{t.post ? 'Delete this post and all its replies? This cannot be undone.' : 'Delete this reply (and the replies under it)? This cannot be undone.'}</p>}
    </Modal>
  )
}
