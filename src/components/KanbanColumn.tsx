import { useDroppable } from '@dnd-kit/core'
import type { Stage } from '../types'
import type { ReactNode } from 'react'

type KanbanColumnProps = {
    stage: Stage
    label: string
    count: number
    children: ReactNode
}

export function KanbanColumn({
    stage,
    label,
    count,
    children,
}: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: stage,
    })

    return (
        <div
            ref={setNodeRef}
            id={stage}
            className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:bg-slate-800/50 dark:border-slate-700"
        >
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{count} deals</span>
            </div>
            <div className="space-y-3 min-h-[50px]">{children}</div>
        </div>
    )
}
