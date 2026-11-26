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

import { DepartmentTree } from '@/components/department-tree/department-tree';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  EnterpriseDepartment,
  EnterpriseRole,
  EnterpriseUser,
} from '@/services/enterprise-service';
import { LucideChevronDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface EditUserFormValues {
  nickname: string;
  departmentId: string;
  roleId: string;
}

interface EditUserDialogProps {
  user: EnterpriseUser;
  departments: EnterpriseDepartment[];
  roles: EnterpriseRole[];
  loading: boolean;
  hideModal: () => void;
  onOk: (values: EditUserFormValues) => void;
}

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

// Radix Select rejects empty-string item values, so the "no role" choice
// uses a sentinel mapped back to "" on submit.
const NoRole = '__no_role__';

export function EditUserDialog({
  user,
  departments,
  roles,
  loading,
  hideModal,
  onOk,
}: EditUserDialogProps) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(user.nickname);
  const [departmentId, setDepartmentId] = useState(user.department_id);
  const [roleId, setRoleId] = useState(user.role_id);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleNicknameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNickname(e.target.value);
    },
    [],
  );

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === departmentId),
    [departments, departmentId],
  );

  const handlePickDepartment = useCallback(
    (department: EnterpriseDepartment) => {
      setDepartmentId(department.id);
      setDepartmentPickerOpen(false);
    },
    [],
  );

  const handleClearDepartment = useCallback(() => {
    setDepartmentId('');
    setDepartmentPickerOpen(false);
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setRoleId(value === NoRole ? '' : value);
  }, []);

  // The account is the login identity and stays read-only here; the username
  // is required while department and role may be left unassigned.
  const formComplete = nickname.trim() !== '';

  const handleOk = useCallback(() => {
    if (!formComplete) {
      return;
    }
    onOk({
      nickname: nickname.trim(),
      departmentId,
      roleId,
    });
  }, [formComplete, nickname, departmentId, roleId, onOk]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('enterprise.editUser')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-account">{t('enterprise.email')}</Label>
            <Input id="edit-user-account" value={user.email} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-user-nickname">
              {t('enterprise.nickname')} <RequiredMark />
            </Label>
            <Input
              id="edit-user-nickname"
              autoFocus
              value={nickname}
              placeholder={t('enterprise.nicknamePlaceholder')}
              onChange={handleNicknameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('enterprise.department')}</Label>
            <Popover
              open={departmentPickerOpen}
              onOpenChange={setDepartmentPickerOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  <span
                    className={cn(
                      'min-w-0 truncate',
                      !selectedDepartment && 'text-text-secondary',
                    )}
                  >
                    {selectedDepartment?.name ||
                      t('enterprise.unassignedDepartment')}
                  </span>
                  <LucideChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto min-w-[var(--radix-popover-trigger-width)] p-1"
              >
                <div
                  className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-text-secondary hover:bg-border-button"
                  onClick={handleClearDepartment}
                >
                  <span className="truncate">
                    {t('enterprise.unassignedDepartment')}
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <DepartmentTree
                    departments={departments}
                    selectedId={departmentId || undefined}
                    onSelect={handlePickDepartment}
                    showActions={false}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('enterprise.role')}</Label>
            <Select
              value={roleId || NoRole}
              onValueChange={handleRoleChange}
              disabled={user.is_superuser}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    user.is_superuser
                      ? t('enterprise.superuserNoRole')
                      : t('enterprise.noRole')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NoRole}>
                  <span className="block max-w-56 truncate">
                    {t('enterprise.noRole')}
                  </span>
                </SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <span className="block max-w-56 truncate">{role.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('common.cancel')}
          </Button>
          <Button loading={loading} disabled={!formComplete} onClick={handleOk}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
