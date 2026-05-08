import { useId } from 'react'
import * as z from 'zod'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  Siren,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FormDirtyIndicator } from '../components/form-dirty-indicator'
import { FormNavigationGuard } from '../components/form-navigation-guard'
import { SettingsSection } from '../components/settings-section'
import { useSettingsForm } from '../hooks/use-settings-form'
import { useUpdateOption } from '../hooks/use-update-option'

const bannerSchema = z.object({
  BannerContent: z.string().optional(),
  BannerType: z.enum([
    'notice',
    'maintenance',
    'important',
    'warning',
    'outage',
    'success',
  ]),
  BannerDismissible: z.boolean(),
  BannerMode: z.enum(['preset', 'code']),
  BannerPreset: z.enum([
    'notice-glass',
    'maintenance-stripe',
    'important-alert',
    'warning-soft',
    'incident-critical',
    'success-soft',
    'flow',
    'pulse',
    'shimmer',
    'rainbow',
    'aurora',
    'spotlight',
    'scanline',
    'solid',
    'gradient',
  ]),
  BannerColors: z.string().optional(),
  BannerSpeed: z.enum(['slow', 'medium', 'fast']),
  BannerVisualConfig: z.string().optional(),
  BannerCustomCSS: z.string().optional(),
  BannerFontColor: z.string().optional(),
})

type BannerFormValues = z.infer<typeof bannerSchema>

type BannerSectionProps = {
  defaultValues: {
    BannerContent: string
    BannerType: string
    BannerDismissible: string
    BannerMode: string
    BannerPreset: string
    BannerColors: string
    BannerSpeed: string
    BannerVisualConfig: string
    BannerCustomCSS: string
    BannerFontColor: string
  }
}

const bannerTypes = [
  ['notice', 'Notice'],
  ['maintenance', 'Maintenance'],
  ['important', 'Important Notice'],
  ['warning', 'Warning'],
  ['outage', 'Incident'],
  ['success', 'Success'],
] as const

const semanticPresets = [
  ['notice-glass', 'Notice glass'],
  ['maintenance-stripe', 'Maintenance stripe'],
  ['important-alert', 'Important alert'],
  ['warning-soft', 'Warning soft'],
  ['incident-critical', 'Incident critical'],
  ['success-soft', 'Success soft'],
] as const

const stylePresets = [
  ['flow', 'Flow'],
  ['pulse', 'Pulse'],
  ['shimmer', 'Shimmer'],
  ['rainbow', 'Rainbow'],
  ['aurora', 'Aurora'],
  ['spotlight', 'Spotlight'],
  ['scanline', 'Scanline'],
  ['solid', 'Solid'],
  ['gradient', 'Gradient'],
] as const

type BannerType =
  | 'notice'
  | 'maintenance'
  | 'important'
  | 'warning'
  | 'outage'
  | 'success'

type BannerMeta = {
  labelKey: string
  icon: LucideIcon
  className: string
}

const bannerMetaMap: Record<string, BannerMeta> = {
  notice: {
    labelKey: 'Notice',
    icon: Megaphone,
    className: 'top-banner-notice',
  },
  maintenance: {
    labelKey: 'Maintenance',
    icon: Wrench,
    className: 'top-banner-maintenance',
  },
  important: {
    labelKey: 'Important Notice',
    icon: ShieldAlert,
    className: 'top-banner-important',
  },
  warning: {
    labelKey: 'Warning',
    icon: AlertTriangle,
    className: 'top-banner-warning',
  },
  outage: { labelKey: 'Incident', icon: Siren, className: 'top-banner-outage' },
  success: {
    labelKey: 'Success',
    icon: CheckCircle2,
    className: 'top-banner-success',
  },
}

const fixedBannerPresetTypes: Record<string, BannerType> = {
  'notice-glass': 'notice',
  'maintenance-stripe': 'maintenance',
  'important-alert': 'important',
  'warning-soft': 'warning',
  'incident-critical': 'outage',
  'success-soft': 'success',
}

const colorEditablePresets = new Set([
  'flow',
  'pulse',
  'shimmer',
  'rainbow',
  'aurora',
  'spotlight',
  'scanline',
  'solid',
  'gradient',
])

function normalizeDefaults(values: BannerSectionProps['defaultValues']) {
  return {
    BannerContent: values.BannerContent ?? '',
    BannerType: bannerSchema.shape.BannerType.safeParse(values.BannerType)
      .success
      ? (values.BannerType as BannerFormValues['BannerType'])
      : 'notice',
    BannerDismissible: values.BannerDismissible !== 'false',
    BannerMode: values.BannerMode === 'code' ? 'code' : 'preset',
    BannerPreset: bannerSchema.shape.BannerPreset.safeParse(values.BannerPreset)
      .success
      ? (values.BannerPreset as BannerFormValues['BannerPreset'])
      : 'notice-glass',
    BannerColors: values.BannerColors ?? '',
    BannerSpeed:
      values.BannerSpeed === 'slow' || values.BannerSpeed === 'fast'
        ? values.BannerSpeed
        : 'medium',
    BannerVisualConfig: values.BannerVisualConfig ?? '',
    BannerCustomCSS: values.BannerCustomCSS ?? '',
    BannerFontColor: values.BannerFontColor ?? '',
  } satisfies BannerFormValues
}

function normalizeBannerSpeed(value: string): string {
  return value === 'slow' || value === 'fast' ? value : 'medium'
}

function buildPresetStyle(preset: string, colors: string): React.CSSProperties {
  const colorList = colors
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  if (colorList.length === 0) return {}
  return colorList.slice(0, 4).reduce<React.CSSProperties>(
    (style, color, index) => ({
      ...style,
      [`--banner-color-${index + 1}`]: color,
    }),
    preset === 'solid'
      ? ({ '--banner-color-2': colorList[0] } as React.CSSProperties)
      : {}
  )
}

function sanitizeCSS(css: string): string {
  return css
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/@import\s+/gi, '')
}

function scopeCustomSelector(selector: string, scope: string): string {
  const trimmed = selector.trim()
  if (!trimmed) return ''
  if (trimmed.includes('&')) return trimmed.replace(/&/g, scope)
  if (trimmed.startsWith('.top-banner'))
    return trimmed.replace(/^\.top-banner/, scope)
  if (trimmed.startsWith(':')) return `${scope}${trimmed}`
  return `${scope} ${trimmed}`
}

function buildScopedPreviewCSS(css: string, scope: string): string {
  const sanitized = sanitizeCSS(css).trim()
  if (!sanitized) return ''
  if (!sanitized.includes('{')) {
    return `${scope} { ${sanitized} }`
  }

  const output: string[] = []
  sanitized.replace(
    /([^{}]+)\{([^{}]*)\}/g,
    (_match, selectorText: string, body: string) => {
      const scopedSelector = selectorText
        .split(',')
        .map((selector) => scopeCustomSelector(selector, scope))
        .filter(Boolean)
        .join(', ')

      if (scopedSelector && body.trim()) {
        output.push(`${scopedSelector} { ${body.trim()} }`)
      }
      return ''
    }
  )

  return output.join('\n')
}

type BannerPreviewProps = {
  content: string
  type: BannerType
  mode: 'preset' | 'code'
  preset: string
  colors: string
  speed: string
  fontColor: string
  customCSS: string
  dismissible: boolean
}

function BannerPreview({
  content,
  type,
  mode,
  preset,
  colors,
  speed,
  fontColor,
  customCSS,
  dismissible,
}: BannerPreviewProps) {
  const { t } = useTranslation()
  const previewId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const previewClassName = `banner-preview-${previewId}`

  const resolvedType =
    mode === 'preset' && fixedBannerPresetTypes[preset]
      ? fixedBannerPresetTypes[preset]
      : type

  const meta = bannerMetaMap[resolvedType] || bannerMetaMap.notice
  const BannerIcon = meta.icon
  const bannerLabel = t(meta.labelKey)

  const presetClass =
    mode === 'preset' && preset
      ? `banner-preset-${preset} banner-speed-${normalizeBannerSpeed(speed)}`
      : ''

  const bgStyle: React.CSSProperties = (() => {
    if (
      mode === 'preset' &&
      colorEditablePresets.has(preset) &&
      colors.trim()
    ) {
      return buildPresetStyle(preset, colors)
    }
    return {}
  })()

  const fontColorStyle: React.CSSProperties = fontColor
    ? { color: fontColor }
    : {}

  const scopedCustomCSS =
    mode === 'code' && customCSS.trim()
      ? buildScopedPreviewCSS(customCSS, `.${previewClassName}`)
      : ''

  const displayContent = content || t('Preview will appear here...')
  const isEmpty = !content

  return (
    <div className='space-y-2'>
      {scopedCustomCSS ? <style>{scopedCustomCSS}</style> : null}
      <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
        <Eye className='h-3.5 w-3.5' />
        {t('Live preview')}
      </div>
      <div
        className={`top-banner top-banner-workspace ${previewClassName} ${meta.className} relative flex items-center text-sm ${presetClass}`}
        style={{ ...bgStyle, ...fontColorStyle, animation: 'none' }}
      >
        <span className='top-banner-icon'>
          <BannerIcon className='h-3.5 w-3.5' />
        </span>
        <div className='top-banner-copy flex-1 overflow-hidden'>
          <div className='text-center whitespace-nowrap'>
            <span
              className={`top-banner-message ${isEmpty ? 'opacity-40' : ''}`}
            >
              <strong>{bannerLabel}</strong>
              <span className='top-banner-separator'>/</span>
              {displayContent}
            </span>
          </div>
        </div>
        {dismissible && (
          <button
            type='button'
            aria-label={t('Close')}
            className='ml-2 shrink-0 cursor-default rounded-sm opacity-70'
            tabIndex={-1}
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    </div>
  )
}

export function BannerSection({ defaultValues }: BannerSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const normalizedDefaults = normalizeDefaults(defaultValues)

  const { form, handleSubmit, handleReset, isDirty, isSubmitting } =
    useSettingsForm<BannerFormValues>({
      resolver: zodResolver(bannerSchema) as Resolver<
        BannerFormValues,
        unknown,
        BannerFormValues
      >,
      defaultValues: normalizedDefaults,
      onSubmit: async (_data, changedFields) => {
        for (const [key, value] of Object.entries(changedFields)) {
          await updateOption.mutateAsync({
            key,
            value:
              typeof value === 'boolean' ? String(value) : String(value ?? ''),
          })
        }
      },
    })

  const mode = form.watch('BannerMode')
  const watchedContent = form.watch('BannerContent')
  const watchedType = form.watch('BannerType')
  const watchedPreset = form.watch('BannerPreset')
  const watchedColors = form.watch('BannerColors')
  const watchedSpeed = form.watch('BannerSpeed')
  const watchedFontColor = form.watch('BannerFontColor')
  const watchedDismissible = form.watch('BannerDismissible')
  const watchedCustomCSS = form.watch('BannerCustomCSS')

  return (
    <>
      <FormNavigationGuard when={isDirty} />
      <SettingsSection
        title={t('Top Banner')}
        description={t(
          'Display a configurable banner above the application header'
        )}
      >
        <Form {...form}>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <FormDirtyIndicator isDirty={isDirty} />

            <BannerPreview
              content={watchedContent ?? ''}
              type={watchedType}
              mode={mode}
              preset={watchedPreset}
              colors={watchedColors ?? ''}
              speed={watchedSpeed}
              fontColor={watchedFontColor ?? ''}
              customCSS={watchedCustomCSS ?? ''}
              dismissible={watchedDismissible}
            />

            <FormField
              control={form.control}
              name='BannerContent'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Banner content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t(
                        'Enter banner content to display at the top of the page'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Leave empty to disable the top banner.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='BannerType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Banner type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {bannerTypes.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {t(label)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='BannerPreset'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Banner preset')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectLabel>{t('Semantic presets')}</SelectLabel>
                          {semanticPresets.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {t(label)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>{t('Style presets')}</SelectLabel>
                          {stylePresets.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {t(label)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='BannerMode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Styling mode')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value='preset'>{t('Preset')}</SelectItem>
                          <SelectItem value='code'>
                            {t('Custom CSS')}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='BannerSpeed'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Animation speed')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value='slow'>{t('Slow')}</SelectItem>
                          <SelectItem value='medium'>{t('Medium')}</SelectItem>
                          <SelectItem value='fast'>{t('Fast')}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='BannerDismissible'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {t('Allow dismissal')}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'Allow users to close this banner. If disabled, the close button is hidden.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {mode === 'preset' ? (
              <FormField
                control={form.control}
                name='BannerColors'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Preset colors')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='#0f172a,#2563eb,#0891b2,#0f766e'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Optional comma-separated CSS colors for editable presets.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name='BannerCustomCSS'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Custom CSS')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder='background: linear-gradient(to right, #111827, #2563eb);'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Write scoped CSS for the banner. Use declarations directly, or use & for nested selectors.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='BannerFontColor'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Font color')}</FormLabel>
                  <FormControl>
                    <Input placeholder='#ffffff' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Optional CSS color for banner text.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex gap-2'>
              <Button
                type='submit'
                disabled={isSubmitting || updateOption.isPending}
              >
                {updateOption.isPending ? t('Saving...') : t('Save Changes')}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleReset}
                disabled={!isDirty || updateOption.isPending || isSubmitting}
              >
                <RotateCcw className='mr-2 h-4 w-4' />
                {t('Reset')}
              </Button>
            </div>
          </form>
        </Form>
      </SettingsSection>
    </>
  )
}
