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
import { Spin } from '@/components/ui/spin';
import { useFetchDatasetFolders } from '@/hooks/use-kb-folder-request';
import { cn } from '@/lib/utils';
import { DatasetFolder } from '@/services/kb-folder-service';
import {
  LucideChevronRight,
  LucideFolder,
  LucideFolderOpen,
  LucidePenLine,
  LucidePlus,
  LucideTrash2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface FolderTreeProps {
  datasetId: string;
  // The selected folder id; '' selects the unfiled root, undefined nothing.
  selectedFolderId?: string;
  onSelect?: (folderId: string) => void;
  // Management actions render only when canManage and the callbacks exist.
  canManage?: boolean;
  onAddChild?: (folder: DatasetFolder) => void;
  onRename?: (folder: DatasetFolder) => void;
  onDelete?: (folder: DatasetFolder) => void;
  className?: string;
}

interface FolderNodeActionsProps {
  folder: DatasetFolder;
  onAddChild: (folder: DatasetFolder) => void;
  onRename: (folder: DatasetFolder) => void;
  onDelete: (folder: DatasetFolder) => void;
}

function FolderNodeActions({
  folder,
  onAddChild,
  onRename,
  onDelete,
}: FolderNodeActionsProps) {
  const { t } = useTranslation();

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddChild(folder);
    },
    [folder, onAddChild],
  );
  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRename(folder);
    },
    [folder, onRename],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(folder);
    },
    [folder, onDelete],
  );

  return (
    <span className="flex items-center gap-0.5 rounded bg-bg-card opacity-0 transition-opacity group-hover/folder-row:opacity-100">
      <RAGFlowTooltip asChild tooltip={t('kbFolder.addSubFolder')}>
        <Button variant="ghost" size="icon-xs" onClick={handleAddChild}>
          <LucidePlus className="size-3.5" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('common.rename')}>
        <Button variant="ghost" size="icon-xs" onClick={handleRename}>
          <LucidePenLine className="size-3.5" />
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

interface FolderNodeProps {
  datasetId: string;
  folder: DatasetFolder;
  depth: number;
  selectedFolderId?: string;
  onSelect?: (folderId: string) => void;
  canManage?: boolean;
  onAddChild?: (folder: DatasetFolder) => void;
  onRename?: (folder: DatasetFolder) => void;
  onDelete?: (folder: DatasetFolder) => void;
}

function FolderNode({
  datasetId,
  folder,
  depth,
  selectedFolderId,
  onSelect,
  canManage,
  onAddChild,
  onRename,
  onDelete,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  // One query per expanded branch: the tree loads lazily level by level.
  const { data: children = [], isPending: childrenLoading } =
    useFetchDatasetFolders(datasetId, folder.id, { enabled: expanded });

  const selected = selectedFolderId === folder.id;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const handleSelect = useCallback(() => {
    onSelect?.(folder.id);
    setExpanded((prev) => !prev);
  }, [folder.id, onSelect]);

  return (
    <div>
      <div
        className={cn(
          'group/folder-row flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-text-secondary hover:bg-bg-card',
          selected && 'bg-bg-card text-text-primary',
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleSelect}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-5 shrink-0"
          onClick={handleToggle}
        >
          <LucideChevronRight
            className={cn(
              'size-3.5 transition-transform',
              expanded && 'rotate-90',
            )}
          />
        </Button>
        {expanded ? (
          <LucideFolderOpen className="size-4 shrink-0" />
        ) : (
          <LucideFolder className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate" title={folder.name}>
          {folder.name}
        </span>
        {canManage && onAddChild && onRename && onDelete && (
          <FolderNodeActions
            folder={folder}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
          />
        )}
      </div>
      {expanded && (
        <div>
          {childrenLoading && !children.length ? (
            <div className="flex justify-center py-2">
              <Spin size="small" />
            </div>
          ) : (
            children.map((child) => (
              <FolderNode
                key={child.id}
                datasetId={datasetId}
                folder={child}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                onSelect={onSelect}
                canManage={canManage}
                onAddChild={onAddChild}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  datasetId,
  selectedFolderId,
  onSelect,
  canManage,
  onAddChild,
  onRename,
  onDelete,
  className,
}: FolderTreeProps) {
  const { t } = useTranslation();
  const { data: rootFolders = [], isPending: rootLoading } =
    useFetchDatasetFolders(datasetId, '');

  if (rootLoading && !rootFolders.length) {
    return (
      <div className={cn('flex justify-center py-6', className)}>
        <Spin size="small" />
      </div>
    );
  }

  if (!rootFolders.length) {
    return (
      <div
        className={cn(
          'px-2 py-4 text-center text-sm text-text-secondary',
          className,
        )}
      >
        {t('kbFolder.noFolderYet')}
      </div>
    );
  }

  return (
    <div className={className}>
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          datasetId={datasetId}
          folder={folder}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          canManage={canManage}
          onAddChild={onAddChild}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
