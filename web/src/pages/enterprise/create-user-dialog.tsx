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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  EnterpriseDepartment,
  EnterpriseRole,
} from '@/services/enterprise-service';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Radix Select forbids empty-string item values, so "unassigned" options use a
// sentinel and map back to "" on submit.
const UnassignedValue = '__unassigned__';

export interface CreateUserFormValues {
  email: string;
  password: string;
  departmentId: string;
  roleId: string;
}

interface CreateUserDialogProps {
  departments: EnterpriseDepartment[];
  roles: EnterpriseRole[];
  loading: boolean;
  hideModal: () => void;
  onOk: (values: CreateUserFormValues) => void;
}

export function CreateUserDialog({
  departments,
  roles,
  loading,
  hideModal,
  onOk,
}: CreateUserDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState(UnassignedValue);
  const [roleId, setRoleId] = useState(UnassignedValue);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentId(value);
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setRoleId(value);
  }, []);

  const handleOk = useCallback(() => {
    if (!email.trim() || !password) {
      return;
    }
    onOk({
      email: email.trim(),
      password,
      departmentId: departmentId === UnassignedValue ? '' : departmentId,
      roleId: roleId === UnassignedValue ? '' : roleId,
    });
  }, [email, password, departmentId, roleId, onOk]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('enterprise.createUser')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-user-email">{t('enterprise.email')}</Label>
            <Input
              id="create-user-email"
              autoFocus
              type="email"
              value={email}
              placeholder={t('enterprise.emailPlaceholder')}
              onChange={handleEmailChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-user-password">
              {t('enterprise.password')}
            </Label>
            <Input
              id="create-user-password"
              type="password"
              value={password}
              placeholder={t('enterprise.passwordPlaceholder')}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('enterprise.department')}</Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UnassignedValue}>
                  {t('enterprise.noDepartmentOption')}
                </SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    <span className="block max-w-56 truncate">
                      {department.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('enterprise.role')}</Label>
            <Select value={roleId} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UnassignedValue}>
                  {t('enterprise.noRoleOption')}
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
          <Button
            loading={loading}
            disabled={!email.trim() || !password}
            onClick={handleOk}
          >
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
