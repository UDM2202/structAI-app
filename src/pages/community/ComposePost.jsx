// /community/new?kind=question|discussion|design[&design=<element>:<id>]
// /community/posts/:id/edit  (title, text, topics; the shared design is fixed)
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiHelpCircle, FiMessageSquare, FiLayers } from 'react-icons/fi'
import AccountLayout from '../../components/layout/AccountLayout'
import Dropdown from '../../components/Dropdown'
import { useAuth } from '../../contexts/AuthContext'
import { communityApi } from '../../services/accountsApi'
import { listAllDesigns, designRoute, ELEMENTS } from '../../utils/savedDesigns'
import { Panel, Btn, Field, TextInput, TextArea, Notice } from '../org/orgUi'
import { TagChip, RichText } from './communityUi'
import { STATUS_CLS } from './community'

const KIND_OPTS = [
  { key: 'question', label: 'Ask a question', icon: FiHelpCircle, hint: 'You can accept the answer that solved it.' },
  { key: 'discussion', label: 'Start a discussion', icon: FiMessageSquare, hint: 'Share experience, news, or an opinion.' },
  { key: 'design', label: 'Share a design', icon: FiLayers, hint: 'Publish a saved design: others can open the full report and copy it.' },
]
const MAX_TAGS = 5

export default function ComposePost() {
  const { id: editId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kind, setKind] = useState(KIND_OPTS.some((k) => k.key === params.get('kind')) ? params.get('kind') : 'question')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [chosen, setChosen] = useState([])
  const [designKey, setDesignKey] = useState(params.get('design') || '')
  const [tags, setTags] = useState([])
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const [loaded, setLoaded] = useState(!editId)

  useEffect(() => { communityApi.tags().then(setTags).catch(() => {}) }, [])
  useEffect(() => {
    if (!editId) return
    communityApi.post(editId).then((p) => {
      setKind(p.kind); setTitle(p.title); setBody(p.body); setChosen(p.tags.map((t) => t.slug)); setLoaded(true)
    }).catch((e) => setError(e.message))
  }, [editId])

  // Only the user's own saved designs can be published.
  const myDesigns = useMemo(() => listAllDesigns().filter((d) => !d.owner_id || d.owner_id === user?.id), [user])
  const design = myDesigns.find((d) => `${d.element}:${d.id}` === designKey)
  useEffect(() => {
    if (design && !title && !editId) setTitle(design.name || '')
  }, [design]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (slug) => setChosen((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : c.length >= MAX_TAGS ? c : [...c, slug]))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setFields({})
    try {
      let post
      if (editId) {
        post = await communityApi.updatePost(editId, { title, body, tags: chosen })
      } else {
        const payload = { kind, title, body, tags: chosen }
        if (kind === 'design') {
          if (!design) throw Object.assign(new Error('Choose one of your saved designs to share.'), { fields: {} })
          const { savedDesignId: _omit, ...state } = design.state || { designResult: design.designResult, formData: design.formData }
          payload.design = {
            element: design.element, name: design.name || 'Design', subtitle: design.subtitle || '',
            status: design.status || '', route: designRoute(design, design.element), state,
          }
        }
        post = await communityApi.createPost(payload)
      }
      navigate(`/community/posts/${post.id}`, { replace: !!editId })
    } catch (err) {
      setError(err.message)
      setFields(err.fields || {})
      setBusy(false)
    }
  }

  const designOpts = myDesigns.map((d) => ({
    value: `${d.element}:${d.id}`,
    label: `${d.name || 'Untitled'} · ${ELEMENTS[d.element]?.label || d.element}${d.status ? ` · ${d.status}` : ''}`,
  }))
  const bodyMin = kind === 'design' ? 0 : 20

  return (
    <AccountLayout title={editId ? 'Edit post' : 'New post'} subtitle="Community">
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
        <Link to={editId ? `/community/posts/${editId}` : '/community'} className="inline-flex items-center gap-1 text-sm text-[#0A2F44] hover:underline dark:text-[#66a4c2]">
          <FiArrowLeft /> {editId ? 'Back to the post' : 'Community'}
        </Link>

        {!editId && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Post type">
            {KIND_OPTS.map((k) => (
              <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} onClick={() => setKind(k.key)}
                className={`rounded-md border p-3 text-left transition-colors ${kind === k.key
                  ? 'border-[#0A2F44] bg-[#f0f7fb] dark:border-[#66a4c2] dark:bg-[#132b3a]'
                  : 'border-[#e2e8f0] bg-white hover:border-[#94a3b8] dark:border-[#334155] dark:bg-[#1f2937]'}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A] dark:text-white"><k.icon /> {k.label}</span>
                <span className="mt-1 block text-xs text-[#64748b] dark:text-[#94a3b8]">{k.hint}</span>
              </button>
            ))}
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <Panel index="01" title={kind === 'design' ? 'Design' : 'Post'} bodyClass="p-4 space-y-4">
          {kind === 'design' && !editId && (
            <Field label="Saved design" error={fields.design}
              hint={myDesigns.length ? 'The full report and inputs are published. Remove anything confidential (client, site) from the design name first.' : undefined}>
              {myDesigns.length
                ? <Dropdown value={designKey} onChange={setDesignKey} options={designOpts} placeholder="Choose a saved design" />
                : <Notice tone="warn">You have no saved designs yet. Run a design, press Save on its results page, then come back. <Link to="/quick-design" className="underline">Start a design</Link></Notice>}
            </Field>
          )}
          {design && kind === 'design' && (
            <div className="rounded border border-[#e2e8f0] p-3 text-xs dark:border-[#334155]">
              <span className="font-mono uppercase tracking-wider text-[#64748b]">{ELEMENTS[design.element]?.label}</span>
              {design.status && <span className={`ml-2 font-mono font-semibold ${STATUS_CLS[design.status] || ''}`}>{design.status}</span>}
              {design.subtitle && <p className="mt-1 text-[#475569] dark:text-[#94a3b8]">{design.subtitle}</p>}
            </div>
          )}
          <Field label="Title" error={fields.title} hint={kind === 'question' ? 'Be specific, e.g. "Punching shear at an edge column: which u1 for a 300 x 300 column?"' : undefined}>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required minLength={8} />
          </Field>
          <Field label={kind === 'design' ? 'Notes (optional)' : 'Details'} error={fields.body}
            hint={`${body.length} / 20000. Plain text; \`code\` and \`\`\` blocks; links are clickable.`}>
            {preview
              ? <div className="min-h-[10rem] rounded border border-[#cbd5e1] p-3 dark:border-[#475569]"><RichText text={body || '(nothing yet)'} /></div>
              : <TextArea rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000}
                  placeholder={kind === 'question' ? 'Element, code clause, loads, what you have tried, where it disagrees…' : ''} />}
          </Field>
          <div className="flex justify-end">
            <Btn size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</Btn>
          </div>
          <Field label={`Topics (up to ${MAX_TAGS})`} error={fields.tags}>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => <TagChip key={t.slug} tag={t} active={chosen.includes(t.slug)} onClick={() => toggleTag(t.slug)} />)}
            </div>
          </Field>
        </Panel>

        <div className="flex justify-end gap-2">
          <Link to={editId ? `/community/posts/${editId}` : '/community'}><Btn>Cancel</Btn></Link>
          <Btn type="submit" variant="primary"
            disabled={!loaded || busy || title.trim().length < 8 || body.trim().length < bodyMin || (kind === 'design' && !editId && !design)}>
            {busy ? 'Publishing…' : editId ? 'Save changes' : 'Publish'}
          </Btn>
        </div>
      </form>
    </AccountLayout>
  )
}
