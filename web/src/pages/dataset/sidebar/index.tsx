import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  LucideBookText,
  LucideFolderOpen,
  LucideLogs,
  LucideSettings,
  LucideTextSearch,
  LucideUsers,
} from 'lucide-react';

import { SecondarySidebarHeader } from '@/components/sidebar-header';
import { Button } from '@/components/ui/button';
import { useDatasetSidebarExtraItems } from '@/ee/hooks/use-dataset-sidebar-extra-items';
import { useSecondPathName } from '@/hooks/route-hook';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';

import { IDataset } from '@/interfaces/database/dataset';
import { useParams } from 'react-router';
import { useKbManagePermission } from '../hooks/use-kb-manage-permission';

type PropType = {
  dataset: IDataset;
  onCollapse: () => void;
  onMenuSelect: () => void;
};

export function SideBar({ dataset: data, onCollapse, onMenuSelect }: PropType) {
  const pathName = useSecondPathName();
  const { id } = useParams();
  const { t } = useTranslation();
  const extraItems = useDatasetSidebarExtraItems();
  const { canManageMembers } = useKbManagePermission();

  const items = useMemo(() => {
    const list = [
      {
        icon: <LucideFolderOpen className="size-[1em]" />,
        label: t(`knowledgeDetails.subbarFiles`),
        key: Routes.Files,
      },
      {
        icon: <LucideTextSearch className="size-[1em]" />,
        label: t(`knowledgeDetails.testing`),
        key: Routes.DatasetTesting,
      },
      {
        icon: <LucideLogs className="size-[1em]" />,
        label: t(`knowledgeDetails.overview`),
        key: Routes.DataSetOverview,
      },
      // Configuration stays with the knowledge base creator (and the
      // superuser); members manage content, not the knowledge base itself.
      {
        icon: <LucideSettings className="size-[1em]" />,
        label: t(`knowledgeDetails.configuration`),
        key: Routes.DataSetSetting,
        manageOnly: true,
      },
      {
        icon: <LucideBookText className="size-[1em]" />,
        label: t('knowledgeCompilation.artifacts'),
        key: Routes.Compilation,
      },
    ];

    return [
      ...list.filter((item) => !item.manageOnly || canManageMembers),
      ...extraItems,
    ];
  }, [t, extraItems, canManageMembers]);

  return (
    <aside className="flex flex-col w-64 relative">
      <SecondarySidebarHeader title={data.name} onCollapse={onCollapse} />

      <nav className="px-5 pt-1 pb-5 overflow-y-auto">
        <ul className="space-y-5">
          {items.map((item) => {
            const active = '/' + pathName === item.key;

            return (
              <li key={item.key}>
                <Button
                  asLink
                  block
                  variant="ghost"
                  className={cn(
                    'justify-start gap-2.5 px-3 relative h-10 text-base',
                    active && 'bg-bg-card text-text-primary',
                  )}
                  to={`${Routes.DatasetBase}${item.key}/${id}`}
                  onClick={onMenuSelect}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>

        {canManageMembers && (
          <ul className="space-y-5 pt-5">
            <li>
              <Button
                asLink
                block
                variant="ghost"
                className={cn(
                  'justify-start gap-2.5 px-3 relative h-10 text-base',
                  '/' + pathName === Routes.DatasetMembers &&
                    'bg-bg-card text-text-primary',
                )}
                to={`${Routes.DatasetBase}${Routes.DatasetMembers}/${id}`}
                onClick={onMenuSelect}
              >
                <LucideUsers className="size-[1em]" />
                <span>{t('kbMember.memberManagement')}</span>
              </Button>
            </li>
          </ul>
        )}
      </nav>
    </aside>
  );
}
