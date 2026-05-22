import { useNavigate } from '@tanstack/react-router'
import i18n from 'i18next'
import { useAuthStore } from '@/stores/auth-store'
import { getSelf } from '@/lib/api'
import {
  getFrontendTheme,
  setFrontendTheme,
} from '@/lib/frontend-theme'
import type { User } from '@/features/users/types'
import { saveUserId } from '../lib/storage'

function getSavedLanguage(user: User): string | undefined {
  const userData = user as Record<string, unknown>
  if (typeof userData.language === 'string') {
    return userData.language
  }

  if (typeof userData.setting !== 'string') {
    return undefined
  }

  try {
    const setting = JSON.parse(userData.setting) as { language?: unknown }
    return typeof setting.language === 'string' ? setting.language : undefined
  } catch {
    return undefined
  }
}

export function useAuthRedirect() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const handleLoginSuccess = async (
    userData?: { id?: number } | null,
    redirectTo?: string
  ) => {
    if (userData?.id) {
      saveUserId(userData.id)
    }

    try {
      const self = await getSelf()
      if (self?.success && self.data) {
        const user = self.data as User
        auth.setUser(user)

        if (user.id) {
          saveUserId(user.id)
        }

        const savedLang = getSavedLanguage(user)
        if (savedLang && savedLang !== i18n.language) {
          i18n.changeLanguage(savedLang)
        }

        const theme = getFrontendTheme()
        if (theme === 'classic') {
          setFrontendTheme('classic')
          window.location.replace('/console')
          return
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }

    const targetPath = redirectTo || '/dashboard'
    navigate({ to: targetPath, replace: true })
  }

  const redirectTo2FA = () => {
    navigate({ to: '/otp', replace: true })
  }

  const redirectToLogin = () => {
    navigate({ to: '/sign-in', replace: true })
  }

  const redirectToRegister = () => {
    navigate({ to: '/sign-up', replace: true })
  }

  return {
    handleLoginSuccess,
    redirectTo2FA,
    redirectToLogin,
    redirectToRegister,
  }
}
