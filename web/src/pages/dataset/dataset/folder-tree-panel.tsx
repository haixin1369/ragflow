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

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RAGFlowTooltip } from '@/components/ui/tooltip';
import {
  useCreateDatasetFolder,
  useDeleteDatasetFolder,
  useRenameDatasetFolder,
} from '@/hooks/use-kb-folder-request';
import { cn } from '@/lib/utils';
import { DatasetFolder } from '@/services/kb-folder-service';
import { LucideFiles, LucideInbox, LucidePlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKbManagePermission } from '../hooks/use-kb-manage-permission';
import { FolderTree } from './folder-tree';

export const enum FolderDialogMode {
  Create = 'create',
  Rename = 'rename',
}

interface FolderNameDialogState {
  mode: FolderDialogMode;
  // The parent folder for create; undefined creates a root folder.
  parent?: DatasetFolder;
  // The folder being renamed; undefined in create mode.
  renameTarget?: DatasetFolder;
}

interface FolderNameDialogProps {
  state: FolderNameDialogState;
  loading: boolean;
  hideModal: () => void;
  onOk: (name: string) => void;
}

function FolderNameDialog({
  state,
  loading,
  hideModal,
  onOk,
}: FolderNameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(
    state.mode === FolderDialogMode.Rename
      ? (state.renameTarget?.name ?? '')
      : '',
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleOk = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    onOk(name.trim());
  }, [name, onOk]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleOk();
      }
    },
    [handleOk],
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {state.mode === FolderDialogMode.Create
              ? state.parent
                ? t('kbFolder.addSubFolder')
                : t('kbFolder.newFolder')
              : t('common.rename')}
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          placeholder={t('kbFolder.folderNamePlaceholder')}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
        />
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('common.cancel')}
          </Button>
          <Button loading={loading} disabled={!name.trim()} onClick={handleOk}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderTreePanelProps {
  datasetId: string;
  // undefined = all documents, '' = the unfiled root, an id = one folder.
  selectedFolderId: string | undefined;
  onSelect: (folderId: string | undefined) => void;
  className?: string;
}

export function FolderTreePanel({
  datasetId,
  selectedFolderId,
  onSelect,
  className,
}: FolderTreePanelProps) {
  const { t } = useTranslation();
  const { canManage } = useKbManagePermission();

  const [nameDialog, setNameDialog] = useState<FolderNameDialogState | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DatasetFolder | null>(null);

  const createFolderMutation = useCreateDatasetFolder();
  const renameFolderMutation = useRenameDatasetFolder();
  const deleteFolderMutation = useDeleteDatasetFolder();

  const showCreateRoot = useCallback(() => {
    setNameDialog({ mode: FolderDialogMode.Create });
  }, []);

  const handleAddChild = useCallback((parent: DatasetFolder) => {
    setNameDialog({ mode: FolderDialogMode.Create, parent });
  }, []);

  const handleRename = useCallback((folder: DatasetFolder) => {
    setNameDialog({ mode: FolderDialogMode.Rename, renameTarget: folder });
  }, []);

  const handleShowDelete = useCallback((folder: DatasetFolder) => {
    setDeleteTarget(folder);
  }, []);

  const hideNameDialog = useCallback(() => {
    setNameDialog(null);
  }, []);

  const handleNameDialogOk = useCallback(
    (name: string) => {
      if (!nameDialog) {
        return;
      }
      if (nameDialog.mode === FolderDialogMode.Create) {
        createFolderMutation.mutate(
          {
            datasetId,
            parentId: nameDialog.parent?.id ?? '',
            name,
          },
          { onSuccess: hideNameDialog },
        );
        return;
      }
      renameFolderMutation.mutate(
        {
          datasetId,
          folderId: nameDialog.renameTarget!.id,
          name,
        },
        { onSuccess: hideNameDialog },
      );
    },
    [
      nameDialog,
      datasetId,
      createFolderMutation,
      renameFolderMutation,
      hideNameDialog,
    ],
  );

  const hideDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleDeleteOk = useCallback(() => {
    if (!deleteTarget) {
      return;
    }
    deleteFolderMutation.mutate(
      { datasetId, folderId: deleteTarget.id },
      { onSuccess: hideDeleteDialog },
    );
  }, [deleteTarget, datasetId, deleteFolderMutation, hideDeleteDialog]);

  const handleSelectAll = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const handleSelectUnfiled = useCallback(() => {
    onSelect('');
  }, [onSelect]);

  const renderPseudoNode = (
    label: string,
    active: boolean,
    icon: React.ReactNode,
    onSelectNode: () => void,
  ) => (
    <div
      className={cn(
        'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-text-secondary hover:bg-bg-card',
        active && 'bg-bg-card text-text-primary',
      )}
      onClick={onSelectNode}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );

  return (
    <Card
      className={cn(
        'w-60 shrink-0 flex flex-col min-h-0 overflow-hidden',
        className,
      )}
    >
      <CardHeader className="shrink-0 border-b border-border-button py-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{t('kbFolder.folderPanel')}</span>
          {canManage && (
            <RAGFlowTooltip asChild tooltip={t('kbFolder.newFolder')}>
              <Button variant="ghost" size="icon-sm" onClick={showCreateRoot}>
                <LucidePlus className="size-4" />
              </Button>
            </RAGFlowTooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto p-2">
        {renderPseudoNode(
          t('kbFolder.allDocuments'),
          selectedFolderId === undefined,
          <LucideFiles className="size-4 shrink-0" />,
          handleSelectAll,
        )}
        {renderPseudoNode(
          t('kbFolder.unfiled'),
          selectedFolderId === '',
          <LucideInbox className="size-4 shrink-0" />,
          handleSelectUnfiled,
        )}
        <FolderTree
          datasetId={datasetId}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          canManage={canManage}
          onAddChild={handleAddChild}
          onRename={handleRename}
          onDelete={handleShowDelete}
        />
      </CardContent>

      {nameDialog && (
        <FolderNameDialog
          state={nameDialog}
          loading={
            createFolderMutation.isPending || renameFolderMutation.isPending
          }
          hideModal={hideNameDialog}
          onOk={handleNameDialogOk}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={hideDeleteDialog}
        title={t('kbFolder.deleteFolderTitle')}
        content={{
          title: deleteTarget?.name,
          node: (
            <div className="text-sm text-text-secondary">
              {t('kbFolder.deleteFolderWarn')}
            </div>
          ),
        }}
        onOk={handleDeleteOk}
      />
    </Card>
  );
}
