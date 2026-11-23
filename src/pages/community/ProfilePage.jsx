// /community/u/:username -- public engineer profile: follow, their posts and
// shared designs, followers / following. Your own profile can be edited here.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiUserPlus, FiUserCheck, FiShield, FiMapPin, FiBriefcase, FiAward } from 'react-icons/fi'
import AccountLayout from '../../components/layout/AccountLayout'
import { useAuth } from '../../contexts/AuthContext'
import { communityApi } from '../../services/accountsApi'
import { ELEMENTS } from '../../utils/savedDesigns'
import { Panel, Btn, Field, TextInput, TextArea, Notice, Modal, Empty } from '../org/orgUi'
import { Avatar, KindBadge, RichText } from './communityUi'
import { STATUS_CLS, timeAgo } from './community'

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'designs', label: 'Shared designs' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
]

export default function ProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('posts')
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    communityApi.profile(username).then((p) => { setProfile(p); setError('') })
      .catch((e) => setError(e.status === 404 ? 'No engineer with this username.' : e.message))
  }, [username])
  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    try {
      const r = profile.is_following ? await communityApi.unfollow(username) : await communityApi.follow(username)
      setProfile((p) => ({ ...p, is_following: r.following, follower_count: r.follower_count }))
    } catch (e) { setError(e.message) }
  }

  if (!profile) {
    return (
      <AccountLayout title="Community" subtitle="Profile">
        <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
          {error ? <><Notice tone="error">{error}</Notice><Link to="/community"><Btn>Back to the Community</Btn></Link></> : <Empty>Loading…</Empty>}
        </div>
      </AccountLayout>
    )
  }

  const facts = [
    [FiBriefcase, [profile.headline, profile.company].filter(Boolean).join(' · ')],
    [FiAward, profile.qualifications],
    [FiMapPin, profile.location],
  ].filter(([, v]) => v)

  return (
    <AccountLayout title="Community" subtitle={profile.display_name}>
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
        <Link to="/community" className="inline-flex items-center gap-1 text-sm text-[#0A2F44] hover:underline dark:text-[#66a4c2]"><FiArrowLeft /> Community</Link>
        {error && <Notice tone="error">{error}</Notice>}
        {profile.is_self && !profile.display_name && <Notice>Add your name and job title so people know who is answering.</Notice>}

        <Panel bodyClass="p-4">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar person={profile} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-xl font-bold text-[#0F172A] dark:text-white">
                {profile.display_name || profile.username}
                {profile.is_moderator && <span title="Community moderator" className="text-base text-amber-600 dark:text-amber-400"><FiShield /></span>}
              </h1>
              <p className="font-mono text-xs text-[#64748b]">@{profile.username} · joined {new Date(profile.joined_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
              {profile.is_banned && <p className="mt-1 font-mono text-xs uppercase text-red-600">Suspended</p>}
              <ul className="mt-2 space-y-0.5 text-sm text-[#475569] dark:text-[#94a3b8]">
                {facts.map(([icon, v], i) => { const Icon = icon; return <li key={i} className="flex items-center gap-1.5"><Icon className="flex-shrink-0" /> {v}</li> })}
              </ul>
              <dl className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-[#64748b]">
                {[['Posts', profile.post_count], ['Designs', profile.design_count], ['Followers', profile.follower_count], ['Following', profile.following_count]].map(([k, v]) => (
                  <div key={k}><dt className="inline">{k} </dt><dd className="inline font-semibold text-[#0F172A] dark:text-white">{v}</dd></div>
                ))}
              </dl>
            </div>
            {profile.is_self
              ? <Btn onClick={() => setEditing(true)}><FiEdit2 /> Edit profile</Btn>
              : <Btn variant={profile.is_following ? 'secondary' : 'primary'} onClick={toggleFollow}>
                  {profile.is_following ? <><FiUserCheck /> Following</> : <><FiUserPlus /> Follow</>}
                </Btn>}
          </div>
          {profile.about && <div className="mt-4 border-t border-[#e2e8f0] pt-3 dark:border-[#334155]"><RichText text={profile.about} /></div>}
        </Panel>

        <div role="tablist" className="flex flex-wrap gap-1 border-b border-[#e2e8f0] dark:border-[#334155]">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${tab === t.key
                ? 'border-[#0A2F44] text-[#0A2F44] dark:border-[#66a4c2] dark:text-[#66a4c2]'
                : 'border-transparent text-[#64748b] hover:text-[#0F172A] dark:text-[#94a3b8] dark:hover:text-white'}`}>{t.label}</button>
          ))}
        </div>
        {tab === 'posts' || tab === 'designs'
          ? <UserPosts key={tab} username={username} designs={tab === 'designs'} />
          : <PeopleList key={tab} username={username} direction={tab} />}
      </div>
      {editing && <EditProfile profile={profile} onClose={() => setEditing(false)} onSaved={(p) => { setProfile(p); setEditing(false) }} />}
    </AccountLayout>
  )
}

function UserPosts({ username, designs }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    communityApi.posts({ author: username, kind: designs ? 'design' : 'posts', sort: 'new' }).then(setData).catch((e) => setError(e.message))
  }, [username, designs])
  if (error) return <Notice tone="error">{error}</Notice>
  if (!data) return <Empty>Loading…</Empty>
  if (!data.results.length) return <Empty>{designs ? 'No shared designs' : 'No posts'}</Empty>
  return (
    <Panel bodyClass="">
      <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
        {data.results.map((p) => (
          <li key={p.id} className="px-4 py-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <KindBadge kind={p.kind} />
              {p.design && <span className="font-mono text-[10px] uppercase text-[#64748b]">{ELEMENTS[p.design.element]?.label}</span>}
              {p.design?.status && <span className={`font-mono text-[10px] font-semibold ${STATUS_CLS[p.design.status] || ''}`}>{p.design.status}</span>}
              <span className="font-mono text-[11px] text-[#94a3b8]">{timeAgo(p.created_at)} · {p.vote_count} up · {p.comment_count} replies</span>
            </div>
            <Link to={`/community/posts/${p.id}`} className="text-sm font-semibold text-[#0F172A] hover:underline dark:text-white">{p.title}</Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function PeopleList({ username, direction }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    (direction === 'followers' ? communityApi.followers(username) : communityApi.following(username)).then(setData).catch(() => setData({ results: [] }))
  }, [username, direction])
  if (!data) return <Empty>Loading…</Empty>
  if (!data.results.length) return <Empty>{direction === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</Empty>
  return (
    <Panel bodyClass="">
      <ul className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
        {data.results.map((p) => (
          <li key={p.username} className="flex items-center gap-3 px-4 py-2">
            <Avatar person={p} size="sm" />
            <Link to={`/community/u/${encodeURIComponent(p.username)}`} className="text-sm font-medium text-[#0F172A] hover:underline dark:text-white">{p.display_name}</Link>
            {p.headline && <span className="truncate text-xs text-[#64748b]">{p.headline}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const FIELDS = [
  ['display_name', 'Name', 80],
  ['headline', 'Job title', 120],
  ['company', 'Company', 120],
  ['qualifications', 'Qualifications', 160],
  ['location', 'Location', 120],
]

function EditProfile({ profile, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState(() => Object.fromEntries([...FIELDS.map(([k]) => [k, profile[k] || '']), ['about', profile.about || ''], ['avatar', profile.avatar || '']]))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // From the account profile (/profile): same fields, kept in this browser.
  const fromAccount = () => setForm((f) => ({
    ...f,
    display_name: user?.name || f.display_name,
    headline: user?.job_title || user?.jobTitle || f.headline,
    company: user?.company || f.company,
    qualifications: user?.qualifications || f.qualifications,
    location: user?.location || f.location,
    about: user?.about || user?.bio || f.about,
    avatar: user?.avatar || f.avatar,
  }))

  const pickPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height)
      const c = document.createElement('canvas'); c.width = 256; c.height = 256
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256)
      setForm((f) => ({ ...f, avatar: c.toDataURL('image/jpeg', 0.85) }))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => setError('That file could not be read as an image.')
    img.src = URL.createObjectURL(file)
  }

  const save = async () => {
    setBusy(true); setError('')
    try { onSaved(await communityApi.updateMyProfile(form)) } catch (e) { setError(e.message); setBusy(false) }
  }

  return (
    <Modal title="Edit community profile" onClose={onClose} width="max-w-xl"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn></>}>
      <p className="text-xs">Everyone signed in to Sphere Design Hub can see this profile.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex items-center gap-3">
        <Avatar person={{ ...profile, ...form }} size="lg" />
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" onClick={() => fileRef.current?.click()}>Upload photo</Btn>
          {form.avatar && <Btn size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, avatar: '' }))}>Remove</Btn>}
          <Btn size="sm" variant="ghost" onClick={fromAccount}>Copy from my account profile</Btn>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(([k, label, max]) => (
          <Field key={k} label={label}><TextInput value={form[k]} onChange={set(k)} maxLength={max} /></Field>
        ))}
      </div>
      <Field label="About" hint={`${form.about.length} / 2000`}><TextArea rows={4} value={form.about} onChange={set('about')} maxLength={2000} /></Field>
    </Modal>
  )
}
