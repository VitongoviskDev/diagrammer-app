import { useDiagrammerStore } from '@/store'

/**
 * The canvas gestures were designed around Ctrl on Windows/Linux. On macOS the
 * equivalent modifier is Command (Meta): Ctrl+click there is turned into a
 * right-click by the OS, so a Ctrl-based drag never arrives as a primary-button
 * press and the gesture silently breaks.
 *
 * Platform detection is only used to *label* the modifier — the gesture itself
 * accepts either key (see MODIFIER_KEYS), so a browser that lies about its
 * platform (privacy-hardened ones report "Win32" everywhere) can't break it.
 */
const signals = [
  (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform,
  navigator.platform,
  navigator.userAgent,
]

/** Any signal claiming macOS wins — one masked value shouldn't flip the result. */
export const detectedMac = signals.some((s) => !!s && /mac|iphone|ipad|ipod/i.test(s))

/** `KeyboardEvent.key` values treated as "the modifier", whatever the platform. */
export const MODIFIER_KEYS = ['Meta', 'Control']

export function isModifierKey(key: string) {
  return MODIFIER_KEYS.includes(key)
}

/** How the modifier is written in tooltips and the shortcuts panel. */
export function modLabel(macStyle: boolean) {
  return macStyle ? '⌘' : 'Ctrl'
}

/** Detection, unless the user corrected it from the shortcuts panel. */
export function useIsMacModifier() {
  const override = useDiagrammerStore((s) => s.macModifierOverride)
  return override ?? detectedMac
}
