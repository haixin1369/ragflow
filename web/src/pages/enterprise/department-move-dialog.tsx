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
import {
  RootDepartmentId,
  collectDepartmentSubtreeIds,
  getDepartmentDepth,
} from '@/components/department-tree/department-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EnterpriseDepartment } from '@/services/enterprise-service';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Radix Select forbids empty-string item values, so the root option uses a
// sentinel and maps back to "" on submit.
const RootOptionValue = '__root__';

interface DepartmentMoveDialogProps {
  department: EnterpriseDepartment;
  departments: EnterpriseDepartment[];
  loading: boolean;
  hideModal: () => void;
  onOk: (parentId: string) => void;
}

export function DepartmentMoveDialog({
  department,
  departments,
  loading,
  hideModal,
  onOk,
}: DepartmentMoveDialogProps) {
  const { t } = useTranslation();
  const [parentId, setParentId] = useState(
    department.parent_id === RootDepartmentId
      ? RootOptionValue
      : department.parent_id,
  );

  const excludedIds = useMemo(
    () => collectDepartmentSubtreeIds(departments, department.id),
    [department, departments],
  );

  const candidates = useMemo(
    () => departments.filter((item) => !excludedIds.has(item.id)),
    [departments, excludedIds],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleParentChange = useCallback((value: string) => {
    setParentId(value);
  }, []);

  const handleOk = useCallback(() => {
    onOk(parentId === RootOptionValue ? RootDepartmentId : parentId);
  }, [parentId, onOk]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('enterprise.moveDepartment', { name: department.name })}
          </DialogTitle>
        </DialogHeader>
        <Select value={parentId} onValueChange={handleParentChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RootOptionValue}>
              {t('enterprise.rootDepartment')}
            </SelectItem>
            {candidates.map((item) => (
              <SelectItem key={item.id} value={item.id} className="min-w-0">
                <span
                  className="block truncate"
                  style={{
                    paddingLeft: getDepartmentDepth(departments, item.id) * 16,
                  }}
                >
                  {item.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
