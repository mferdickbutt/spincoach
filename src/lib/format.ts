import type { Lang } from '@/locale/lang'

export function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2)
}

export function formatWhen(lang: Lang, at = Date.now()): string {
  return new Date(at).toLocaleString(lang, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
