import { Outlet } from 'react-router';

// Hosts the settings pages that live under the global sidebar
// (model providers, data sources, chat channels, MCP). Full-height flex
// column so pages with their own inner sidebars or `flex-1 h-0` card bodies
// stretch and scroll correctly.
export default function SettingsPageLayout() {
  return (
    <div className="flex size-full min-w-0 flex-col p-5 [&>*]:min-h-0">
      <Outlet />
    </div>
  );
}
