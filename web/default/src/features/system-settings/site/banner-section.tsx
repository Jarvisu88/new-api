import * as z from 'zod'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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

const bannerPresets = [
  ['notice-glass', 'Notice glass'],
  ['maintenance-stripe', 'Maintenance stripe'],
  ['important-alert', 'Important alert'],
  ['warning-soft', 'Warning soft'],
  ['incident-critical', 'Incident critical'],
  ['success-soft', 'Success soft'],
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
    BannerSpeed: values.BannerSpeed === 'slow' || values.BannerSpeed === 'fast'
      ? values.BannerSpeed
      : 'medium',
    BannerVisualConfig: values.BannerVisualConfig ?? '',
    BannerCustomCSS: values.BannerCustomCSS ?? '',
    BannerFontColor: values.BannerFontColor ?? '',
  } satisfies BannerFormValues
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
            value: typeof value === 'boolean' ? String(value) : String(value ?? ''),
          })
        }
      },
    })

  const mode = form.watch('BannerMode')

  return (
    <>
      <FormNavigationGuard when={isDirty} />
      <SettingsSection
        title={t('Top Banner')}
        description={t('Display a configurable banner above the application header')}
      >
        <Form {...form}>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <FormDirtyIndicator isDirty={isDirty} />

            <FormField
              control={form.control}
              name='BannerContent'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Banner content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t('Enter banner content to display at the top of the page')}
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
                          {bannerPresets.map(([value, label]) => (
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
                          <SelectItem value='code'>{t('Custom CSS')}</SelectItem>
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
                      {t('Allow users to close this banner. If disabled, the close button is hidden.')}
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
                      {t('Optional comma-separated CSS colors for editable presets.')}
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
                      {t('Write scoped CSS for the banner. Use declarations directly, or use & for nested selectors.')}
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
