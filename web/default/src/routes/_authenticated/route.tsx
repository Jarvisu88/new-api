import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getSelf } from '@/lib/api'
import { getFrontendTheme } from '@/lib/frontend-theme'
import { AuthenticatedLayout } from '@/components/layout'

let sessionVerified = false

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { auth } = useAuthStore.getState()

    if (!auth.user) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    if (!sessionVerified) {
      const res = await getSelf().catch(() => null)
      if (res?.success && res.data) {
        auth.setUser(res.data)
        sessionVerified = true
      } else {
        auth.reset()
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }
    }

    const theme = getFrontendTheme()
    if (theme === 'classic') {
      window.location.replace('/console')
      return
    }
  },
  component: AuthenticatedLayout,
})
