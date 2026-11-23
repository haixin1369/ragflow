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

export interface CreateUserFormValues {
  nickname: string;
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

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

// The account accepts letters, digits, and underscores only.
const AccountFormat = /^[A-Za-z0-9_]+$/;

export function CreateUserDialog({
  departments,
  roles,
  loading,
  hideModal,
  onOk,
}: CreateUserDialogProps) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');

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

  // Every field is required: the confirm button stays disabled until the
  // name, account, password, department, and role are all filled in and the
  // account matches the allowed character set.
  const account = email.trim();
  const accountValid = AccountFormat.test(account);
  const formComplete =
    nickname.trim() !== '' &&
    accountValid &&
    password !== '' &&
    departmentId !== '' &&
    roleId !== '';

  const handleOk = useCallback(() => {
    if (!formComplete) {
      return;
    }
    onOk({
      nickname: nickname.trim(),
      email: email.trim(),
      password,
      departmentId,
      roleId,
    });
  }, [formComplete, nickname, email, password, departmentId, roleId, onOk]);

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
            <Label htmlFor="create-user-nickname">
              {t('enterprise.nickname')} <RequiredMark />
            </Label>
            <Input
              id="create-user-nickname"
              autoFocus
              value={nickname}
              placeholder={t('enterprise.nicknamePlaceholder')}
              onChange={handleNicknameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-user-email">
              {t('enterprise.email')} <RequiredMark />
            </Label>
            <Input
              id="create-user-email"
              type="text"
              value={email}
              placeholder={t('enterprise.emailPlaceholder')}
              onChange={handleEmailChange}
            />
            {account !== '' && !accountValid && (
              <span className="text-xs text-red-500">
                {t('enterprise.accountFormatHint')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-user-password">
              {t('enterprise.password')} <RequiredMark />
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
            <Label>
              {t('enterprise.department')} <RequiredMark />
            </Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('enterprise.selectDepartment')} />
              </SelectTrigger>
              <SelectContent>
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
            <Label>
              {t('enterprise.role')} <RequiredMark />
            </Label>
            <Select value={roleId} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('enterprise.selectRole')} />
              </SelectTrigger>
              <SelectContent>
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
