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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const enum UserAssignType {
  Department = 'department',
  Role = 'role',
}

// Radix Select forbids empty-string item values, so the "unassigned" option
// uses a sentinel and maps back to "" on submit.
const UnassignedValue = '__unassigned__';

export interface UserAssignOption {
  id: string;
  name: string;
}

interface UserAssignDialogProps {
  type: UserAssignType;
  username: string;
  options: UserAssignOption[];
  // The currently assigned id; "" means unassigned.
  currentId?: string;
  loading: boolean;
  hideModal: () => void;
  onOk: (value: string) => void;
}

export function UserAssignDialog({
  type,
  username,
  options,
  currentId = '',
  loading,
  hideModal,
  onOk,
}: UserAssignDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(
    currentId === '' ? UnassignedValue : currentId,
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleChange = useCallback((nextValue: string) => {
    setValue(nextValue);
  }, []);

  const handleOk = useCallback(() => {
    onOk(value === UnassignedValue ? '' : value);
  }, [value, onOk]);

  const unassignedLabel =
    type === UserAssignType.Department
      ? t('enterprise.removeDepartment')
      : t('enterprise.removeRole');

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {type === UserAssignType.Department
              ? t('enterprise.assignDepartment')
              : t('enterprise.assignRole')}
            <span className="text-text-secondary"> - {username}</span>
          </DialogTitle>
        </DialogHeader>
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UnassignedValue}>{unassignedLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className="block max-w-56 truncate">{option.name}</span>
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
