import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
    const [theme, setTheme] = useState<Theme | null>(null)

    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved) {
            setTheme(saved)
            document.documentElement.classList.toggle('dark', saved === 'dark')
        } else {
            const pref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            setTheme(pref)
            document.documentElement.classList.toggle('dark', pref === 'dark')
        }
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }

    return { theme, toggleTheme }
}
