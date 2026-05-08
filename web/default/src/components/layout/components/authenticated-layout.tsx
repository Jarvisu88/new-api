import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AnimatedOutlet } from '@/components/page-transition'
import { SkipToMain } from '@/components/skip-to-main'
import { WorkspaceProvider } from '../context/workspace-context'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout(props: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  return (
    <LayoutProvider>
      <SearchProvider>
        <WorkspaceProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            className='authenticated-shell h-svh flex-col overflow-hidden'
          >
            <SkipToMain />
            <div className='flex h-svh min-h-0 w-full flex-1'>
              <AppSidebar />
              <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                <AppHeader />
                <SidebarInset
                  className={cn('@container/content', 'min-h-0 flex-1')}
                >
                  {props.children ?? <AnimatedOutlet />}
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </WorkspaceProvider>
      </SearchProvider>
    </LayoutProvider>
  )
}
