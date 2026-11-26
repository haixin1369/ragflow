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
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const enum RoleDialogMode {
  Create = 'create',
  Edit = 'edit',
}

// Menus that own the seeded function permissions; group labels reuse the
// sidebar translations so the tree follows the navigation naming.
const enum PermissionMenu {
  KnowledgeBase = 'knowledgeBase',
  Chat = 'chat',
  Studio = 'studio',
  Library = 'library',
  Other = 'other',
}

// Maps a permission code prefix to its owning menu. The prefixes are the
// contract in internal/entity/role.go (kb./chat./agent./file.) — document
// actions are member-level, not role-level, so no doc. codes exist here.
// Unknown prefixes fall into the catch-all group so newly seeded codes never
// disappear from the dialog.
const PermissionMenuByPrefix: Record<string, PermissionMenu> = {
  kb: PermissionMenu.KnowledgeBase,
  chat: PermissionMenu.Chat,
  agent: PermissionMenu.Studio,
  file: PermissionMenu.Library,
};

const PermissionMenuOrder: PermissionMenu[] = [
  PermissionMenu.KnowledgeBase,
  PermissionMenu.Chat,
  PermissionMenu.Studio,
  PermissionMenu.Library,
  PermissionMenu.Other,
];

interface PermissionGroup {
  menu: PermissionMenu;
  permissions: EnterprisePermission[];
}

function groupPermissionsByMenu(
  permissions: EnterprisePermission[],
): PermissionGroup[] {
  const groups = new Map<PermissionMenu, EnterprisePermission[]>();
  for (const permission of permissions) {
    const prefix = permission.code.split('.')[0] ?? '';
    const menu = PermissionMenuByPrefix[prefix] ?? PermissionMenu.Other;
    const group = groups.get(menu);
    if (group) {
      group.push(permission);
    } else {
      groups.set(menu, [permission]);
    }
  }
  return PermissionMenuOrder.filter((menu) => groups.has(menu)).map(
    (menu) => ({ menu, permissions: groups.get(menu)! }),
  );
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

  const groups = useMemo(
    () => groupPermissionsByMenu(permissions),
    [permissions],
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

  const toggleGroup = useCallback((codes: string[], checked: boolean) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (checked) {
          next.add(code);
        } else {
          next.delete(code);
        }
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

  const menuLabel = useCallback(
    (menu: PermissionMenu) =>
      menu === PermissionMenu.Other
        ? t('enterprise.permissionGroupOther')
        : t(`sidebar.${menu}`),
    [t],
  );

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
            <ScrollArea className="h-64 rounded-md border border-border-button">
              <div className="flex flex-col gap-1 p-2">
                {groups.map((group) => {
                  const codes = group.permissions.map((item) => item.code);
                  const selectedCount = codes.filter((code) =>
                    selectedPermissions.has(code),
                  ).length;
                  const groupState =
                    selectedCount === 0
                      ? false
                      : selectedCount === codes.length
                        ? true
                        : 'indeterminate';
                  const handleGroupCheckedChange = (
                    checked: boolean | 'indeterminate',
                  ) => toggleGroup(codes, checked === true);
                  return (
                    <div key={group.menu} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 rounded-md p-2 hover:bg-border-button">
                        <Checkbox
                          id={`role-menu-${group.menu}`}
                          checked={groupState}
                          onCheckedChange={handleGroupCheckedChange}
                        />
                        <Label
                          htmlFor={`role-menu-${group.menu}`}
                          className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-text-primary"
                        >
                          <span className="truncate">{menuLabel(group.menu)}</span>
                        </Label>
                        <span className="shrink-0 text-xs font-normal text-text-secondary">
                          {selectedCount}/{codes.length}
                        </span>
                      </div>
                      {group.permissions.map((permission) => {
                        const checked = selectedPermissions.has(permission.code);
                        const handleCheckedChange = (
                          checked: boolean | 'indeterminate',
                        ) => togglePermission(permission.code, checked === true);
                        return (
                          <div
                            key={permission.code}
                            className="ml-7 flex items-start gap-2 rounded-md p-2 hover:bg-border-button"
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
                    </div>
                  );
                })}
                {!groups.length && (
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
