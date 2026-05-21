import { useRef } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../components/settings-section'
import { useResetForm } from '../hooks/use-reset-form'
import { useUpdateOption } from '../hooks/use-update-option'

const langfuseSchema = z.object({
  enabled: z.boolean(),
  host: z.string(),
  public_key: z.string(),
  secret_key: z.string(),
  trace_content: z.boolean(),
})

type LangfuseFormValues = z.infer<typeof langfuseSchema>

type LangfuseSettingsSectionProps = {
  defaultValues: {
    'langfuse_setting.enabled': boolean
    'langfuse_setting.host': string
    'langfuse_setting.public_key': string
    'langfuse_setting.secret_key': string
    'langfuse_setting.trace_content': boolean
  }
}

export function LangfuseSettingsSection({
  defaultValues,
}: LangfuseSettingsSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const baselineRef = useRef<LangfuseFormValues>({
    enabled: defaultValues['langfuse_setting.enabled'],
    host: defaultValues['langfuse_setting.host'],
    public_key: defaultValues['langfuse_setting.public_key'],
    secret_key: defaultValues['langfuse_setting.secret_key'],
    trace_content: defaultValues['langfuse_setting.trace_content'],
  })

  const formDefaults: LangfuseFormValues = {
    enabled: defaultValues['langfuse_setting.enabled'],
    host: defaultValues['langfuse_setting.host'],
    public_key: defaultValues['langfuse_setting.public_key'],
    secret_key: defaultValues['langfuse_setting.secret_key'],
    trace_content: defaultValues['langfuse_setting.trace_content'],
  }

  const form = useForm<LangfuseFormValues>({
    resolver: zodResolver(langfuseSchema),
    defaultValues: formDefaults,
  })

  useResetForm(form, formDefaults)

  const keyMap: Record<keyof LangfuseFormValues, string> = {
    enabled: 'langfuse_setting.enabled',
    host: 'langfuse_setting.host',
    public_key: 'langfuse_setting.public_key',
    secret_key: 'langfuse_setting.secret_key',
    trace_content: 'langfuse_setting.trace_content',
  }

  const onSubmit = async (values: LangfuseFormValues) => {
    const updates = (Object.keys(values) as Array<keyof LangfuseFormValues>).filter(
      (key) => values[key] !== baselineRef.current[key]
    )

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    for (const key of updates) {
      await updateOption.mutateAsync({
        key: keyMap[key],
        value: values[key],
      })
    }

    baselineRef.current = { ...values }
  }

  return (
    <SettingsSection
      title={t('Langfuse Tracing')}
      description={t('Send LLM usage traces to Langfuse for observability and analytics')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-base'>
                    {t('Enable Langfuse Tracing')}
                  </FormLabel>
                  <FormDescription>
                    {t('Send request traces to Langfuse for LLM observability')}
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

          <FormField
            control={form.control}
            name='host'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Langfuse Host')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://cloud.langfuse.com'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('Langfuse server URL (cloud or self-hosted)')}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='public_key'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Public Key')}</FormLabel>
                <FormControl>
                  <Input placeholder='pk-lf-...' {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='secret_key'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Secret Key')}</FormLabel>
                <FormControl>
                  <Input type='password' placeholder='sk-lf-...' {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='trace_content'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-base'>
                    {t('Trace Request/Response Content')}
                  </FormLabel>
                  <FormDescription>
                    {t('Include full prompt and completion content in traces. Disabling sends only token counts and metadata.')}
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

          <Button type='submit' disabled={updateOption.isPending}>
            {updateOption.isPending ? t('Saving...') : t('Save')}
          </Button>
        </form>
      </Form>
    </SettingsSection>
  )
}