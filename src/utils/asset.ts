/**
 * Resolve a public-folder asset path against the app's base URL.
 *
 * Vite rewrites asset paths it sees in imports/HTML/CSS, but textures here are
 * loaded from plain runtime strings ('/textures/…') that it can't see — so on a
 * non-root deploy (e.g. GitHub project pages at /Orrery/) those would 404.
 * Funnel every runtime public asset through this. BASE_URL is '/' in dev and
 * for root deploys, so this is a no-op there.
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
