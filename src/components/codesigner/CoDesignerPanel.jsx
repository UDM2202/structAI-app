// The Co-designer as a side panel over the design pages (opened from the
// MainLayout header), so a project's design mode is not left. The open
// conversation is remembered for this browser tab.
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { FiX, FiMaximize2, FiCpu } from 'react-icons/fi'
import CoDesignerChat from '../../pages/codesigner/CoDesignerChat'

const KEY = 'codesigner_panel_conversation'
const readId = () => { try { return Number(sessionStorage.getItem(KEY)) || null } catch { return null } }

export default function CoDesignerPanel({ onClose }) {
  const [activeId, setActiveId] = useState(readId)
  // close when the page changes (e.g. Open report)
  const { pathname } = useLocation()
  const openedOn = useRef(pathname)
  useEffect(() => { if (pathname !== openedOn.current) onClose() }, [pathname, onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-codesigner-panel])')) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = (id) => {
    setActiveId(id)
    try { if (id) sessionStorage.setItem(KEY, String(id)); else sessionStorage.removeItem(KEY) } catch { /* storage blocked */ }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/30" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside role="dialog" aria-modal="true" aria-label="Co-designer" data-codesigner-panel
        className="flex h-full w-full max-w-[30rem] flex-col border-l border-[#e2e8f0] bg-white shadow-2xl dark:border-[#334155] dark:bg-[#1f2937]">
        <header className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] px-3 py-2 dark:border-[#334155]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2F44] text-white dark:bg-[#66a4c2] dark:text-[#0b1620]"><FiCpu size={15} /></span>
            Co-designer
          </h2>
          <div className="flex items-center gap-1">
            <Link to={activeId ? `/co-designer?c=${activeId}` : '/co-designer'} title="Open the full page" aria-label="Open the full page"
              className="rounded p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0F172A] dark:hover:bg-[#334155] dark:hover:text-white"><FiMaximize2 size={15} /></Link>
            <button type="button" onClick={onClose} aria-label="Close the Co-designer"
              className="rounded p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0F172A] dark:hover:bg-[#334155] dark:hover:text-white"><FiX size={16} /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <CoDesignerChat compact activeId={activeId} onOpen={open} />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
