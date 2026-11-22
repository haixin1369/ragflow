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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LucideInbox } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderTree } from './folder-tree';

interface MoveToFolderDialogProps {
  datasetId: string;
  documentName: string;
  loading: boolean;
  hideModal: () => void;
  // The target folder id; '' moves the document back to the unfiled root.
  onOk: (folderId: string) => void;
}

export function MoveToFolderDialog({
  datasetId,
  documentName,
  loading,
  hideModal,
  onOk,
}: MoveToFolderDialogProps) {
  const { t } = useTranslation();
  const [selectedFolderId, setSelectedFolderId] = useState('');

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleSelectUnfiled = useCallback(() => {
    setSelectedFolderId('');
  }, []);

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, []);

  const handleOk = useCallback(() => {
    onOk(selectedFolderId);
  }, [onOk, selectedFolderId]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('kbFolder.moveToFolder')}
            <span className="text-text-secondary"> - {documentName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-72 min-h-0 overflow-y-auto rounded-md border border-border-button p-2">
          <div
            className={cn(
              'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-text-secondary hover:bg-bg-card',
              selectedFolderId === '' && 'bg-bg-card text-text-primary',
            )}
            onClick={handleSelectUnfiled}
          >
            <LucideInbox className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {t('kbFolder.unfiled')}
            </span>
          </div>
          <FolderTree
            datasetId={datasetId}
            selectedFolderId={selectedFolderId}
            onSelect={handleFolderSelect}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('common.cancel')}
          </Button>
          <Button loading={loading} onClick={handleOk}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
