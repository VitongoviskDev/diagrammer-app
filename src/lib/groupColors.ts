import type { GroupColor } from '@/types'

/** Written out in full on purpose: Tailwind scans the source for literal class
 *  names, so a string built at runtime (`bg-${color}-500/10`) would never make
 *  it into the stylesheet. */
export const GROUP_COLOR_CLASSES: Record<
  GroupColor,
  { surface: string; tab: string; swatch: string; title: string }
> = {
  slate: {
    surface: 'bg-slate-500/10 border-slate-500/40',
    tab: 'bg-slate-500/20 border-slate-500/40',
    swatch: 'bg-slate-500',
    title: 'text-slate-700 dark:text-slate-200',
  },
  amber: {
    surface: 'bg-amber-500/10 border-amber-500/40',
    tab: 'bg-amber-500/20 border-amber-500/40',
    swatch: 'bg-amber-500',
    title: 'text-amber-700 dark:text-amber-200',
  },
  sky: {
    surface: 'bg-sky-500/10 border-sky-500/40',
    tab: 'bg-sky-500/20 border-sky-500/40',
    swatch: 'bg-sky-500',
    title: 'text-sky-700 dark:text-sky-200',
  },
  violet: {
    surface: 'bg-violet-500/10 border-violet-500/40',
    tab: 'bg-violet-500/20 border-violet-500/40',
    swatch: 'bg-violet-500',
    title: 'text-violet-700 dark:text-violet-200',
  },
  rose: {
    surface: 'bg-rose-500/10 border-rose-500/40',
    tab: 'bg-rose-500/20 border-rose-500/40',
    swatch: 'bg-rose-500',
    title: 'text-rose-700 dark:text-rose-200',
  },
  emerald: {
    surface: 'bg-emerald-500/10 border-emerald-500/40',
    tab: 'bg-emerald-500/20 border-emerald-500/40',
    swatch: 'bg-emerald-500',
    title: 'text-emerald-700 dark:text-emerald-200',
  },
}
