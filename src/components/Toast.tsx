import { Info, X } from 'lucide-react'

type ToastProps = {
    type: 'success' | 'error'
    message: string
    onClose: () => void
}

export function Toast({ type, message, onClose }: ToastProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-xs items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            <div
                className={`mt-0.5 h-2 w-2 rounded-full ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
            />
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1">
                    <Info size={12} className="text-slate-500 dark:text-slate-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {type === 'success' ? 'Tudo certo' : 'Algo deu errado'}
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{message}</p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
                <X size={12} />
            </button>
        </div>
    )
}
