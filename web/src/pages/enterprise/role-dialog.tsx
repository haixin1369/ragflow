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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  EnterprisePermission,
  EnterpriseRole,
} from '@/services/enterprise-service';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const enum RoleDialogMode {
  Create = 'create',
  Edit = 'edit',
}

interface RoleDialogProps {
  mode: RoleDialogMode;
  // The role being edited; undefined in create mode.
  role?: EnterpriseRole;
  permissions: EnterprisePermission[];
  loading: boolean;
  hideModal: () => void;
  onOk: (values: {
    name: string;
    description: string;
    permissions: string[];
  }) => void;
}

export function RoleDialog({
  mode,
  role,
  permissions,
  loading,
  hideModal,
  onOk,
}: RoleDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role?.permissions ?? []),
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDescription(e.target.value);
    },
    [],
  );

  const togglePermission = useCallback((code: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }
      return next;
    });
  }, []);

  const handleOk = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    onOk({
      name: name.trim(),
      description: description.trim(),
      permissions: [...selectedPermissions],
    });
  }, [name, description, selectedPermissions, onOk]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {mode === RoleDialogMode.Create
              ? t('enterprise.createRole')
              : t('enterprise.editRole')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">{t('enterprise.roleName')}</Label>
            <Input
              id="role-name"
              autoFocus
              value={name}
              placeholder={t('enterprise.roleNamePlaceholder')}
              onChange={handleNameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-description">
              {t('enterprise.roleDescription')}
            </Label>
            <Input
              id="role-description"
              value={description}
              placeholder={t('enterprise.roleDescriptionPlaceholder')}
              onChange={handleDescriptionChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('enterprise.functionPermissions')}</Label>
            <ScrollArea className="h-52 rounded-md border border-border-button">
              <div className="flex flex-col gap-1 p-2">
                {permissions.map((permission) => {
                  const checked = selectedPermissions.has(permission.code);
                  const handleCheckedChange = (
                    checked: boolean | 'indeterminate',
                  ) => togglePermission(permission.code, checked === true);
                  return (
                    <div
                      key={permission.code}
                      className="flex items-start gap-2 rounded-md p-2 hover:bg-border-button"
                    >
                      <Checkbox
                        id={`role-permission-${permission.code}`}
                        checked={checked}
                        onCheckedChange={handleCheckedChange}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`role-permission-${permission.code}`}
                        className="flex min-w-0 cursor-pointer flex-col gap-0.5"
                      >
                        <span className="truncate text-sm font-normal text-text-primary">
                          {permission.name}
                        </span>
                        <span className="truncate text-xs font-normal text-text-secondary">
                          {permission.code}
                        </span>
                      </Label>
                    </div>
                  );
                })}
                {!permissions.length && (
                  <div className="px-2 py-6 text-center text-sm text-text-secondary">
                    {t('common.noResults')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
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
