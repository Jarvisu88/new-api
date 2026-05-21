import { createFileRoute, redirect } from '@tanstack/react-router'
import { STATISTICS_DEFAULT_SECTION } from '@/features/system-settings/statistics/section-registry.tsx'

export const Route = createFileRoute(
  '/_authenticated/system-settings/statistics/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/system-settings/statistics/$section',
      params: { section: STATISTICS_DEFAULT_SECTION },
    })
  },
})
