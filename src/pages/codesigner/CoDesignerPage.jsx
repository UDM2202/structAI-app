// /co-designer -- the Co-designer full page (dashboard layout). The same chat
// opens as a side panel from the design hub's header (MainLayout).
import React from 'react'
import { useSearchParams } from 'react-router-dom'
import AccountLayout from '../../components/layout/AccountLayout'
import CoDesignerChat from './CoDesignerChat'

export default function CoDesignerPage() {
  const [params, setParams] = useSearchParams()
  const activeId = Number(params.get('c')) || null
  return (
    <AccountLayout title="Co-designer" subtitle="Ask about EC2 design, or have it run designs with the Sphere Design Hub engine">
      <CoDesignerChat activeId={activeId} onOpen={(id) => setParams(id ? { c: String(id) } : {})} />
    </AccountLayout>
  )
}
