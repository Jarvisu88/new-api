import { SettingsPage } from '../components/settings-page'
import type { StatisticsSettings as StatisticsSettingsType } from '../types'
import {
  STATISTICS_DEFAULT_SECTION,
  getStatisticsSectionContent,
} from './section-registry.tsx'

const defaultStatisticsSettings: StatisticsSettingsType = {
  'langfuse_setting.enabled': false,
  'langfuse_setting.host': 'https://cloud.langfuse.com',
  'langfuse_setting.public_key': '',
  'langfuse_setting.secret_key': '',
  'langfuse_setting.trace_content': false,
}

export function StatisticsSettings() {
  return (
    <SettingsPage
      routePath='/_authenticated/system-settings/statistics/$section'
      defaultSettings={defaultStatisticsSettings}
      defaultSection={STATISTICS_DEFAULT_SECTION}
      getSectionContent={getStatisticsSectionContent}
    />
  )
}
