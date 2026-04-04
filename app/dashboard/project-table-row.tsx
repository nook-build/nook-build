'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function ProjectTableRow({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  const router = useRouter()

  function go() {
    router.push(`/project/${id}`)
  }

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[#121722] focus-visible:bg-[#121722] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F4A623]/40"
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Open project: ${label}`}
    >
      {children}
    </tr>
  )
}
