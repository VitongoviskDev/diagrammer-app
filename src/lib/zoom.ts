/** The board's zoom range. React Flow's own floor is 0.5, which isn't far
 *  enough out to take in a large diagram at a glance. */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 2

const LOG_MIN = Math.log(MIN_ZOOM)
const LOG_MAX = Math.log(MAX_ZOOM)

/** Zoom is perceptually multiplicative — 0.5→1 is the same step as 1→2. On a
 *  log scale one pixel of travel is always the same *ratio* (~3% here), so the
 *  slider feels even end to end. Linear would move zoom by a fixed 0.02 per
 *  pixel instead: fine around 100%, but a 20% jump per pixel down at 0.1x,
 *  where nudging the thumb would fling the view. The percentage shown to the
 *  user stays a plain number. */
export function zoomToSlider(zoom: number) {
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  return ((Math.log(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100
}

export function sliderToZoom(value: number) {
  return Math.exp(LOG_MIN + (value / 100) * (LOG_MAX - LOG_MIN))
}
