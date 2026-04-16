import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$clientSlug')({
  component: WorkspaceClientLayout,
})

function WorkspaceClientLayout() {
  return <Outlet />
}
