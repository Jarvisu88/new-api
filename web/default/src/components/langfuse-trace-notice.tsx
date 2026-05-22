import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useStatus } from '@/hooks/use-status'

export function LangfuseTraceNotice() {
  const { t } = useTranslation()
  const { status } = useStatus()

  if (!status?.langfuse_trace_content) return null

  return (
    <Alert className='border-amber-500/50 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200'>
      <ShieldAlert className='text-amber-600 dark:text-amber-400' />
      <AlertDescription>
        {t(
          'This site uses Langfuse to record user prompts and other data. Please be aware of security risks.'
        )}
      </AlertDescription>
    </Alert>
  )
}
