import { createFileRoute, redirect } from '@tanstack/react-router'
import { StatisticsSettings } from '@/features/system-settings/statistics'
import {
  STATISTICS_DEFAULT_SECTION,
  STATISTICS_SECTION_IDS,
} from '@/features/system-settings/statistics/section-registry.tsx'

export const Route = createFileRoute(
  '/_authenticated/system-settings/statistics/$section'
)({
  beforeLoad: ({ params }) => {
    const validSections = STATISTICS_SECTION_IDS as unknown as string[]
    if (!validSections.includes(params.section)) {
      throw redirect({
        to: '/system-settings/statistics/$section',
        params: { section: STATISTICS_DEFAULT_SECTION },
      })
    }
  },
  component: StatisticsSettings,
})
