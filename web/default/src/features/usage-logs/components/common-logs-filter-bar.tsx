import { useState, useCallback, type ReactNode } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import {
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useIsAdmin } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { LOG_TYPES } from '../constants'
import { buildSearchParams } from '../lib/filter'
import { getDefaultTimeRange } from '../lib/utils'
import type { CommonLogFilters } from '../types'
import { CompactDateTimeRangePicker } from './compact-date-time-range-picker'
import { useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')
const logTypeValues = ['0', '1', '2', '3', '4', '5', '6'] as const

type LogTypeValue = (typeof logTypeValues)[number]

function isLogTypeValue(value: string): value is LogTypeValue {
  return (logTypeValues as readonly string[]).includes(value)
}

function getInitialFilters(
  searchParams: Record<string, unknown>
): CommonLogFilters {
  const { start, end } = getDefaultTimeRange()
  return {
    startTime:
      typeof searchParams.startTime === 'number'
        ? new Date(searchParams.startTime)
        : start,
    endTime:
      typeof searchParams.endTime === 'number'
        ? new Date(searchParams.endTime)
        : end,
    ...(searchParams.channel ? { channel: String(searchParams.channel) } : {}),
    ...(searchParams.model ? { model: String(searchParams.model) } : {}),
    ...(searchParams.token ? { token: String(searchParams.token) } : {}),
    ...(searchParams.group ? { group: String(searchParams.group) } : {}),
    ...(searchParams.username
      ? { username: String(searchParams.username) }
      : {}),
    ...(searchParams.requestId
      ? { requestId: String(searchParams.requestId) }
      : {}),
  }
}

function getInitialLogType(type: unknown): LogTypeValue | '' {
  if (Array.isArray(type) && type.length === 1 && isLogTypeValue(type[0])) {
    return type[0]
  }
  return ''
}

interface CommonLogsFilterBarProps {
  autoRefresh: boolean
  isRefreshing: boolean
  onAutoRefreshChange: (checked: boolean) => void
  stats?: ReactNode
  viewOptions?: ReactNode
}

export function CommonLogsFilterBar({
  autoRefresh,
  isRefreshing,
  onAutoRefreshChange,
  stats,
  viewOptions,
}: CommonLogsFilterBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const searchParams = route.useSearch()
  const isAdmin = useIsAdmin()
  const { sensitiveVisible, setSensitiveVisible } = useUsageLogsContext()
  const fetchingLogs = useIsFetching({ queryKey: ['logs'] })

  const [expanded, setExpanded] = useState(false)
  const [filters, setFilters] = useState<CommonLogFilters>(() => {
    return getInitialFilters(searchParams)
  })
  const [logType, setLogType] = useState<LogTypeValue | ''>(() =>
    getInitialLogType(searchParams.type)
  )
  const [timeRangeExplicit, setTimeRangeExplicit] = useState(
    () => searchParams.startTime != null || searchParams.endTime != null
  )

  const handleChange = useCallback(
    (field: keyof CommonLogFilters, value: Date | string | undefined) => {
      setFilters((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleApply = useCallback(() => {
    const filterParams = buildSearchParams(filters, 'common')
    if (!timeRangeExplicit) {
      delete filterParams.startTime
      delete filterParams.endTime
    }
    navigate({
      to: '/usage-logs/$section',
      params: { section: 'common' },
      search: {
        ...filterParams,
        ...(logType ? { type: [logType] } : {}),
        page: 1,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    queryClient.invalidateQueries({ queryKey: ['usage-logs-stats'] })
  }, [filters, logType, navigate, queryClient, timeRangeExplicit])

  const handleReset = useCallback(() => {
    const { start, end } = getDefaultTimeRange()
    const resetFilters: CommonLogFilters = { startTime: start, endTime: end }
    setFilters(resetFilters)
    setLogType('')
    setTimeRangeExplicit(false)

    navigate({
      to: '/usage-logs/$section',
      params: { section: 'common' },
      search: {
        page: 1,
        type: undefined,
        filter: undefined,
        model: undefined,
        token: undefined,
        channel: undefined,
        group: undefined,
        username: undefined,
        requestId: undefined,
        startTime: undefined,
        endTime: undefined,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    queryClient.invalidateQueries({ queryKey: ['usage-logs-stats'] })
  }, [navigate, queryClient])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleApply()
    },
    [handleApply]
  )

  const hasExpandedFilters =
    !!filters.token ||
    !!filters.username ||
    !!filters.channel ||
    !!filters.requestId

  return (
    <div className='space-y-2 sm:space-y-3'>
      {/* Primary filter row */}
      <div className='grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-[minmax(280px,2fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,0.8fr)_auto]'>
        <CompactDateTimeRangePicker
          start={filters.startTime}
          end={filters.endTime}
          onChange={({ start, end }) => {
            setTimeRangeExplicit(true)
            handleChange('startTime', start)
            handleChange('endTime', end)
          }}
          className='col-span-2 lg:col-span-1'
        />
        <Input
          placeholder={t('Model Name')}
          value={filters.model || ''}
          onChange={(e) => handleChange('model', e.target.value)}
          onKeyDown={handleKeyDown}
          className='h-9'
        />
        <Input
          placeholder={t('Group')}
          type={sensitiveVisible ? 'text' : 'password'}
          value={filters.group || ''}
          onChange={(e) => handleChange('group', e.target.value)}
          onKeyDown={handleKeyDown}
          className='h-9'
        />
        <Select
          value={logType}
          onValueChange={(value) => {
            setLogType(isLogTypeValue(value) ? value : '')
          }}
        >
          <SelectTrigger className='h-9'>
            <SelectValue placeholder={t('All Types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('All Types')}</SelectItem>
            {LOG_TYPES.map((type) => (
              <SelectItem key={type.value} value={String(type.value)}>
                {t(type.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type='button'
          className={cn(
            'text-muted-foreground hover:text-foreground flex h-9 items-center gap-1 rounded-md px-2 text-xs transition-colors',
            hasExpandedFilters && !expanded && 'text-primary'
          )}
          onClick={() => setExpanded((p) => !p)}
        >
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
          {expanded ? t('Collapse') : t('Expand')}
        </button>
      </div>

      {/* Expandable filter row */}
      <div
        className={cn(
          'grid gap-2 overflow-hidden transition-all duration-200',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className='min-h-0 overflow-hidden'>
          <div className='grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2'>
            <Input
              placeholder={t('Token Name')}
              type={sensitiveVisible ? 'text' : 'password'}
              value={filters.token || ''}
              onChange={(e) => handleChange('token', e.target.value)}
              onKeyDown={handleKeyDown}
              className='h-9'
            />
            {isAdmin && (
              <Input
                placeholder={t('Username')}
                type={sensitiveVisible ? 'text' : 'password'}
                value={filters.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                onKeyDown={handleKeyDown}
                className='h-9'
              />
            )}
            {isAdmin && (
              <Input
                placeholder={t('Channel ID')}
                value={filters.channel || ''}
                onChange={(e) => handleChange('channel', e.target.value)}
                onKeyDown={handleKeyDown}
                className='h-9'
              />
            )}
            <Input
              placeholder={t('Request ID')}
              value={filters.requestId || ''}
              onChange={(e) => handleChange('requestId', e.target.value)}
              onKeyDown={handleKeyDown}
              className='h-9'
            />
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 flex-wrap items-center gap-2 sm:gap-3'>
          {stats && <div className='min-w-0'>{stats}</div>}
        </div>

        <div className='flex shrink-0 items-center gap-2 self-end sm:self-auto'>
          <div className='flex h-8 items-center gap-2 rounded-md border px-2.5'>
            <span
              className={cn(
                'size-2 rounded-full',
                autoRefresh && isRefreshing
                  ? 'bg-emerald-500'
                  : autoRefresh
                    ? 'bg-emerald-500/55'
                    : 'bg-muted-foreground/35'
              )}
              aria-hidden='true'
            />
            <Label
              htmlFor='usage-logs-auto-refresh'
              className='cursor-pointer text-xs font-medium'
            >
              {t('Auto refresh')}
            </Label>
            <Switch
              id='usage-logs-auto-refresh'
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
              aria-label={t('Auto refresh')}
            />
          </div>
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md border transition-colors'
            title={sensitiveVisible ? t('Hide') : t('Show')}
            aria-label={sensitiveVisible ? t('Hide') : t('Show')}
            onClick={() => setSensitiveVisible(!sensitiveVisible)}
          >
            {sensitiveVisible ? (
              <Eye className='size-3.5' />
            ) : (
              <EyeOff className='size-3.5' />
            )}
          </button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={handleReset}
          >
            <RotateCcw className='size-3.5' />
            {t('Reset')}
          </Button>
          <Button
            size='sm'
            className='h-8'
            onClick={handleApply}
            disabled={fetchingLogs > 0}
          >
            {fetchingLogs > 0 ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <Search className='size-3.5' />
            )}
            {t('Search')}
          </Button>
          {viewOptions}
        </div>
      </div>
    </div>
  )
}
