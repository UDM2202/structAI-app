// Community helpers shared by the pages (non-component exports).
import { useCallback, useEffect, useState } from 'react'
import { FiHelpCircle, FiMessageSquare, FiLayers } from 'react-icons/fi'
import { communityApi } from '../../services/accountsApi'

export const KIND = {
  question: { label: 'Question', icon: FiHelpCircle, cls: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300' },
  discussion: { label: 'Discussion', icon: FiMessageSquare, cls: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300' },
  design: { label: 'Shared design', icon: FiLayers, cls: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300' },
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// The viewer's community status (moderator, suspended, open reports).
export function useCommunityMe() {
  const [me, setMe] = useState(null)
  const load = useCallback(() => {
    communityApi.me().then(setMe).catch(() => setMe(null))
  }, [])
  useEffect(() => { load() }, [load])
  return [me, load]
}

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'abuse', label: 'Abusive or harassing' },
  { value: 'unsafe', label: 'Dangerous engineering advice' },
  { value: 'off_topic', label: 'Off topic' },
  { value: 'private', label: 'Shares private or confidential data' },
  { value: 'other', label: 'Other' },
]

export const STATUS_CLS = {
  PASS: 'text-emerald-600 dark:text-emerald-400',
  FAIL: 'text-red-600 dark:text-red-400',
}
