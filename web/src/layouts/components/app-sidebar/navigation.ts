import { Routes } from '@/routes';
import {
  LucideBoxes,
  LucideBrain,
  LucideBrainCircuit,
  LucideBuilding2,
  LucideDatabase,
  LucideHome,
  LucideLibrary,
  LucideMessagesSquare,
  LucidePlug,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideWebhook,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useLocation } from 'react-router';

// Match on path-segment boundaries, not a loose substring, so e.g.
// "/user-setting/chat-channel" does not match the "/chat" prefix.
export function matchesPath(pathname: string, candidate: string) {
  return pathname === candidate || pathname.startsWith(`${candidate}/`);
}

export enum NavItemKey {
  Home = 'home',
  KnowledgeBase = 'knowledgeBase',
  Chat = 'chat',
  Search = 'search',
  Studio = 'studio',
  Library = 'library',
  Memories = 'memories',
  ModelProviders = 'modelProviders',
  DataSources = 'dataSources',
  ChatChannels = 'chatChannels',
  Mcp = 'mcp',
  UserManagement = 'userManagement',
  RoleManagement = 'roleManagement',
}

export interface NavItem {
  key: NavItemKey;
  path: string;
  labelKey: string;
  icon: LucideIcon;
  // Path prefixes (besides the destination itself) that keep this item
  // highlighted, e.g. detail pages living outside the list route.
  activeAliases: string[];
  // Rendered only for superusers (e.g. the enterprise permission pages).
  superuserOnly?: boolean;
}

export const NavItems: NavItem[] = [
  {
    key: NavItemKey.Home,
    path: Routes.Root,
    labelKey: 'header.home',
    icon: LucideHome,
    activeAliases: [],
  },
  {
    key: NavItemKey.KnowledgeBase,
    path: Routes.Datasets,
    labelKey: 'sidebar.knowledgeBase',
    icon: LucideBoxes,
    activeAliases: [Routes.DatasetBase],
  },
  {
    key: NavItemKey.Chat,
    path: Routes.Chats,
    labelKey: 'sidebar.chat',
    icon: LucideMessagesSquare,
    activeAliases: [Routes.Chat],
  },
  {
    key: NavItemKey.Search,
    path: Routes.Searches,
    labelKey: 'sidebar.search',
    icon: LucideSearch,
    activeAliases: [Routes.Search],
  },
  {
    key: NavItemKey.Studio,
    path: Routes.Agents,
    labelKey: 'sidebar.studio',
    icon: LucideSparkles,
    activeAliases: [
      Routes.AgentTemplates,
      Routes.Agent,
      Routes.Pipeline,
      Routes.AgentLogPage,
      Routes.CompilationTemplatesEditNext,
    ],
  },
  {
    key: NavItemKey.Library,
    path: Routes.Files,
    labelKey: 'sidebar.library',
    icon: LucideLibrary,
    activeAliases: [],
  },
  {
    key: NavItemKey.Memories,
    path: Routes.Memories,
    labelKey: 'sidebar.aiMemory',
    icon: LucideBrain,
    activeAliases: [Routes.Memory],
  },
  {
    key: NavItemKey.ModelProviders,
    path: `${Routes.Integrations}${Routes.Model}`,
    labelKey: 'setting.model',
    icon: LucideBrainCircuit,
    activeAliases: [],
    superuserOnly: true,
  },
  {
    key: NavItemKey.DataSources,
    path: `${Routes.Integrations}${Routes.DataSource}`,
    labelKey: 'setting.dataSources',
    icon: LucideDatabase,
    activeAliases: [
      `${Routes.Integrations}${Routes.DataSource}${Routes.DataSourceDetailPage}`,
    ],
    superuserOnly: true,
  },
  {
    key: NavItemKey.ChatChannels,
    path: `${Routes.Integrations}${Routes.ChatChannel}`,
    labelKey: 'setting.chatChannels',
    icon: LucideWebhook,
    activeAliases: [],
    superuserOnly: true,
  },
  {
    key: NavItemKey.Mcp,
    path: `${Routes.Integrations}${Routes.Mcp}`,
    labelKey: 'sidebar.mcp',
    icon: LucidePlug,
    activeAliases: [],
    superuserOnly: true,
  },
  {
    key: NavItemKey.UserManagement,
    path: Routes.UserManagement,
    labelKey: 'sidebar.userManagement',
    icon: LucideBuilding2,
    activeAliases: [],
    superuserOnly: true,
  },
  {
    key: NavItemKey.RoleManagement,
    path: Routes.RoleManagement,
    labelKey: 'sidebar.roleManagement',
    icon: LucideShieldCheck,
    activeAliases: [],
    superuserOnly: true,
  },
];

export function getActiveNavItemKey(pathname: string): NavItemKey | undefined {
  const item = NavItems.find(
    (x) =>
      (x.path === Routes.Root
        ? pathname === Routes.Root
        : matchesPath(pathname, x.path)) ||
      x.activeAliases.some((alias) => matchesPath(pathname, alias)),
  );
  return item?.key;
}

export function useActiveNavigation() {
  const { pathname } = useLocation();

  return useMemo(
    () => ({
      activeNavKey: getActiveNavItemKey(pathname),
    }),
    [pathname],
  );
}
