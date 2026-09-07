/** Wrapper around location.reload so components can be unit-tested (jsdom
 * cannot stub location methods directly). */
export function hardReload(): void {
  window.location.reload();
}
