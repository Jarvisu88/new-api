export const ENABLED_CLASSIC_FRONTEND_KEY = 'EnabledClassicFrontend'

export type FrontendTheme = 'default' | 'classic'

export function normalizeFrontendTheme(
  value?: string | null
): FrontendTheme {
  if (value === 'classic') {
    return 'classic'
  }
  return 'default'
}

export function getFrontendTheme(): FrontendTheme {
  const enabledClassic = localStorage.getItem(ENABLED_CLASSIC_FRONTEND_KEY)
  return enabledClassic === 'true' ? 'classic' : 'default'
}

export function setFrontendTheme(theme: FrontendTheme): void {
  if (theme === 'classic') {
    localStorage.setItem(ENABLED_CLASSIC_FRONTEND_KEY, 'true')
  } else {
    localStorage.removeItem(ENABLED_CLASSIC_FRONTEND_KEY)
  }
}

export function getFrontendThemeSettingsPath(theme: FrontendTheme): string {
  return theme === 'classic' ? '/console/personal' : '/profile'
}
