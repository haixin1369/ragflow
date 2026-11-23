/*
 *  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Button } from '@/components/ui/button';
import { RAGFlowTooltip } from '@/components/ui/tooltip';
import { TreeView, type TreeDataItem } from '@/components/ui/tree-view';
import type { EnterpriseDepartment } from '@/services/enterprise-service';
import { buildDepartmentChildrenMap } from './department-utils';
import {
  LucideArrowRightLeft,
  LucideFolder,
  LucideFolderOpen,
  LucidePenLine,
  LucidePlus,
  LucideTrash2,
} from 'lucide-react';
import { ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface DepartmentNodeActionsProps {
  department: EnterpriseDepartment;
  onAddChild: (department: EnterpriseDepartment) => void;
  onRename: (department: EnterpriseDepartment) => void;
  onMove: (department: EnterpriseDepartment) => void;
  onDelete: (department: EnterpriseDepartment) => void;
}

function DepartmentNodeActions({
  department,
  onAddChild,
  onRename,
  onMove,
  onDelete,
}: DepartmentNodeActionsProps) {
  const { t } = useTranslation();

  const handleAddChild = useCallback(
    () => onAddChild(department),
    [onAddChild, department],
  );
  const handleRename = useCallback(
    () => onRename(department),
    [onRename, department],
  );
  const handleMove = useCallback(
    () => onMove(department),
    [onMove, department],
  );
  const handleDelete = useCallback(
    () => onDelete(department),
    [onDelete, department],
  );

  return (
    <span className="flex items-center gap-0.5 bg-bg-base">
      <RAGFlowTooltip asChild tooltip={t('enterprise.addSubDepartment')}>
        <Button variant="ghost" size="icon-xs" onClick={handleAddChild}>
          <LucidePlus className="size-3.5" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('common.rename')}>
        <Button variant="ghost" size="icon-xs" onClick={handleRename}>
          <LucidePenLine className="size-3.5" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('enterprise.moveDepartmentTitle')}>
        <Button variant="ghost" size="icon-xs" onClick={handleMove}>
          <LucideArrowRightLeft className="size-3.5" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('common.delete')}>
        <Button variant="delete" size="icon-xs" onClick={handleDelete}>
          <LucideTrash2 className="size-3.5" />
        </Button>
      </RAGFlowTooltip>
    </span>
  );
}

function buildDepartmentTreeItems(
  childrenByParent: Record<string, EnterpriseDepartment[]>,
  parentId: string,
  renderActions: (department: EnterpriseDepartment) => ReactNode,
): TreeDataItem[] {
  return (childrenByParent[parentId] ?? []).map((department) => ({
    id: department.id,
    name: department.name,
    icon: LucideFolder,
    openIcon: LucideFolderOpen,
    actions: renderActions(department),
    children: buildDepartmentTreeItems(
      childrenByParent,
      department.id,
      renderActions,
    ),
  }));
}

interface DepartmentTreeProps {
  departments: EnterpriseDepartment[];
  /** Currently selected department id; undefined means nothing selected. */
  selectedId?: string;
  /** Fires when a node is clicked; callers toggle the filter themselves. */
  onSelect?: (department: EnterpriseDepartment) => void;
  /** Renders the per-node management buttons; false hides them. */
  showActions?: boolean;
  onAddChild?: (department: EnterpriseDepartment) => void;
  onRename?: (department: EnterpriseDepartment) => void;
  onMove?: (department: EnterpriseDepartment) => void;
  onDelete?: (department: EnterpriseDepartment) => void;
}

export function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  showActions = true,
  onAddChild,
  onRename,
  onMove,
  onDelete,
}: DepartmentTreeProps) {
  const { t } = useTranslation();

  const renderActions = useCallback(
    (department: EnterpriseDepartment) =>
      showActions ? (
        <DepartmentNodeActions
          department={department}
          onAddChild={onAddChild!}
          onRename={onRename!}
          onMove={onMove!}
          onDelete={onDelete!}
        />
      ) : null,
    [showActions, onAddChild, onRename, onMove, onDelete],
  );

  const departmentsById = useMemo(
    () =>
      new Map(
        departments.map((department) => [department.id, department]),
      ),
    [departments],
  );

  const handleSelectChange = useCallback(
    (item: TreeDataItem | undefined) => {
      const department = item && departmentsById.get(item.id);
      if (department && onSelect) {
        onSelect(department);
      }
    },
    [departmentsById, onSelect],
  );

  const treeData = useMemo(() => {
    const childrenByParent = buildDepartmentChildrenMap(departments);
    return buildDepartmentTreeItems(childrenByParent, '', renderActions);
  }, [departments, renderActions]);

  if (!treeData.length) {
    return (
      <div className="px-2 py-6 text-center text-sm text-text-secondary">
        {t('enterprise.noDepartmentYet')}
      </div>
    );
  }

  return (
    <TreeView
      // Remount when the selection is cleared externally so the highlight
      // follows the caller-controlled selectedId.
      key={selectedId ?? 'no-selection'}
      data={treeData}
      expandAll
      initialSelectedItemId={selectedId}
      onSelectChange={handleSelectChange}
      defaultNodeIcon={LucideFolder}
    />
  );
}
