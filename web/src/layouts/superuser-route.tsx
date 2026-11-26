import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { Routes } from '@/routes';
import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';

// Gates a route to superusers: renders nothing until the user info request
// has settled, then either the wrapped content or a redirect back home.
// is_superuser is undefined in the query's initialData, so a plain `loading`
// check cannot be used: isFetching only turns true after mount, which would
// redirect during the very render that answered the navigation click.
// The children first mount on a query-driven update (outside react-router's
// transition), so they need their own Suspense boundary for lazy modules.
export function SuperuserGate({ children }: React.PropsWithChildren) {
  const { data } = useFetchUserInfo();

  if (data.is_superuser === undefined) {
    return null;
  }
  if (!data.is_superuser) {
    return <Navigate to={Routes.Root} replace />;
  }
  return <Suspense fallback={null}>{children}</Suspense>;
}

// Pathless layout route guarding its children to superusers.
export default function SuperuserRouteLayout() {
  return (
    <SuperuserGate>
      <Outlet />
    </SuperuserGate>
  );
}
