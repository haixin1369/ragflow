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
import { Input } from '@/components/ui/input';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const enum DepartmentDialogMode {
  Create = 'create',
  Rename = 'rename',
}

interface DepartmentDialogProps {
  mode: DepartmentDialogMode;
  // The department being renamed; undefined in create mode.
  department?: { name: string };
  loading: boolean;
  hideModal: () => void;
  onOk: (name: string) => void;
}

export function DepartmentDialog({
  mode,
  department,
  loading,
  hideModal,
  onOk,
}: DepartmentDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(
    mode === DepartmentDialogMode.Rename ? (department?.name ?? '') : '',
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
            {mode === DepartmentDialogMode.Create
              ? t('enterprise.addDepartment')
              : t('common.rename')}
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          placeholder={t('enterprise.departmentNamePlaceholder')}
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
