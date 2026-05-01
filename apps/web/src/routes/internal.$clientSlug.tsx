import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/internal/$clientSlug')({
  component: InternalClientLayout,
})

function InternalClientLayout() {
  return <Outlet />
}
