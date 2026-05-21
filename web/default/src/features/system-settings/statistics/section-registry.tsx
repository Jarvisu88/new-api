import type { StatisticsSettings } from '../types'
import { createSectionRegistry } from '../utils/section-registry'
import { LangfuseSettingsSection } from './langfuse-settings-section'

const STATISTICS_SECTIONS = [
  {
    id: 'langfuse',
    titleKey: 'Langfuse Tracing',
    descriptionKey: 'Configure Langfuse LLM observability',
    build: (settings: StatisticsSettings) => (
      <LangfuseSettingsSection
        defaultValues={{
          'langfuse_setting.enabled': settings['langfuse_setting.enabled'],
          'langfuse_setting.host': settings['langfuse_setting.host'],
          'langfuse_setting.public_key': settings['langfuse_setting.public_key'],
          'langfuse_setting.secret_key': settings['langfuse_setting.secret_key'],
          'langfuse_setting.trace_content': settings['langfuse_setting.trace_content'],
        }}
      />
    ),
  },
] as const

export type StatisticsSectionId = (typeof STATISTICS_SECTIONS)[number]['id']

const statisticsRegistry = createSectionRegistry<
  StatisticsSectionId,
  StatisticsSettings
>({
  sections: STATISTICS_SECTIONS,
  defaultSection: 'langfuse',
  basePath: '/system-settings/statistics',
  urlStyle: 'path',
})

export const STATISTICS_SECTION_IDS = statisticsRegistry.sectionIds
export const STATISTICS_DEFAULT_SECTION = statisticsRegistry.defaultSection
export const getStatisticsSectionNavItems = statisticsRegistry.getSectionNavItems
export const getStatisticsSectionContent = statisticsRegistry.getSectionContent
