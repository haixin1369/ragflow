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
import { TableEmpty } from '@/components/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RAGFlowTooltip } from '@/components/ui/tooltip';
import { Spin } from '@/components/ui/spin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateEnterpriseRole,
  useDeleteEnterpriseRole,
  useFetchEnterprisePermissions,
  useFetchEnterpriseRoles,
  useUpdateEnterpriseRole,
} from '@/hooks/use-enterprise-request';
import type { EnterpriseRole } from '@/services/enterprise-service';
import { formatDate } from '@/utils/date';
import { useDebounce } from 'ahooks';
import {
  LucidePenLine,
  LucidePlus,
  LucideShieldCheck,
  LucideTrash2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/input';
import { RoleDialog, RoleDialogMode } from './role-dialog';

const RolePermissionBadgeLimit = 3;

interface RoleRowActionsProps {
  role: EnterpriseRole;
  onEdit: (role: EnterpriseRole) => void;
  onDelete: (role: EnterpriseRole) => void;
}

function RoleRowActions({ role, onEdit, onDelete }: RoleRowActionsProps) {
  const { t } = useTranslation();

  const handleEdit = useCallback(() => onEdit(role), [onEdit, role]);
  const handleDelete = useCallback(() => onDelete(role), [onDelete, role]);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <RAGFlowTooltip asChild tooltip={t('enterprise.editRole')}>
        <Button variant="ghost" size="icon-sm" onClick={handleEdit}>
          <LucidePenLine className="size-4" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('common.delete')}>
        <Button variant="delete" size="icon-sm" onClick={handleDelete}>
          <LucideTrash2 className="size-4" />
        </Button>
      </RAGFlowTooltip>
    </div>
  );
}

export default function RoleManagement() {
  const { t } = useTranslation();

  const [searchString, setSearchString] = useState('');
  const keyword = useDebounce(searchString, { wait: 500 });

  const { data: roles, isLoading: rolesLoading } = useFetchEnterpriseRoles();
  const { data: permissions = [] } = useFetchEnterprisePermissions();

  const createRoleMutation = useCreateEnterpriseRole();
  const updateRoleMutation = useUpdateEnterpriseRole();
  const deleteRoleMutation = useDeleteEnterpriseRole();

  const [roleDialog, setRoleDialog] = useState<{
    mode: RoleDialogMode;
    editTarget?: EnterpriseRole;
  } | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] =
    useState<EnterpriseRole | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchString(e.target.value);
    },
    [],
  );

  const showCreateRoleDialog = useCallback(() => {
    setRoleDialog({ mode: RoleDialogMode.Create });
  }, []);

  const handleEditRole = useCallback((role: EnterpriseRole) => {
    setRoleDialog({ mode: RoleDialogMode.Edit, editTarget: role });
  }, []);

  const hideRoleDialog = useCallback(() => {
    setRoleDialog(null);
  }, []);

  const handleRoleDialogOk = useCallback(
    (values: { name: string; description: string; permissions: string[] }) => {
      if (!roleDialog) {
        return;
      }
      if (roleDialog.mode === RoleDialogMode.Create) {
        createRoleMutation.mutate(values, { onSuccess: hideRoleDialog });
        return;
      }
      updateRoleMutation.mutate(
        { roleId: roleDialog.editTarget!.id, params: values },
        { onSuccess: hideRoleDialog },
      );
    },
    [roleDialog, createRoleMutation, updateRoleMutation, hideRoleDialog],
  );

  const handleShowDeleteRole = useCallback((role: EnterpriseRole) => {
    setDeleteRoleTarget(role);
  }, []);

  const hideDeleteRoleDialog = useCallback(() => {
    setDeleteRoleTarget(null);
  }, []);

  const handleDeleteRoleOk = useCallback(() => {
    if (!deleteRoleTarget) {
      return;
    }
    deleteRoleMutation.mutate(deleteRoleTarget.id, {
      onSuccess: hideDeleteRoleDialog,
    });
  }, [deleteRoleTarget, deleteRoleMutation, hideDeleteRoleDialog]);

  const roleItems = (roles ?? []).filter((role) =>
    keyword
      ? role.name.toLowerCase().includes(keyword.toLowerCase()) ||
        role.description.toLowerCase().includes(keyword.toLowerCase())
      : true,
  );

  return (
    <>
      <article
        className="flex size-full min-w-0 flex-col"
        data-testid="role-management"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
          <SearchInput
            value={searchString}
            onChange={handleSearchChange}
            placeholder={t('enterprise.searchRolePlaceholder')}
            className="w-64"
          />
          <Button onClick={showCreateRoleDialog}>
            <LucidePlus className="size-[1em]" />
            {t('enterprise.createRole')}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/5">
                    {t('enterprise.roleName')}
                  </TableHead>
                  <TableHead className="w-1/4">
                    {t('enterprise.roleDescription')}
                  </TableHead>
                  <TableHead className="min-w-0">
                    {t('enterprise.functionPermissions')}
                  </TableHead>
                  <TableHead className="w-1/6">
                    {t('enterprise.createTime')}
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    {t('enterprise.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesLoading && !roleItems.length ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex justify-center py-8">
                        <Spin size="large" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roleItems.length ? (
                  roleItems.map((role) => (
                    <TableRow key={role.id} className="group/row">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <LucideShieldCheck className="size-4 shrink-0 text-text-secondary" />
                          <span
                            className="block max-w-40 truncate"
                            title={role.name}
                          >
                            {role.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="block max-w-64 truncate"
                          title={role.description}
                        >
                          {role.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-96 flex-wrap items-center gap-1">
                          {role.permissions
                            .slice(0, RolePermissionBadgeLimit)
                            .map((code) => (
                              <Badge
                                key={code}
                                variant="secondary"
                                className="max-w-40"
                              >
                                <span className="truncate" title={code}>
                                  {code}
                                </span>
                              </Badge>
                            ))}
                          {role.permissions.length >
                            RolePermissionBadgeLimit && (
                            <Badge variant="outline">
                              +
                              {role.permissions.length -
                                RolePermissionBadgeLimit}
                            </Badge>
                          )}
                          {!role.permissions.length && (
                            <span className="text-sm text-text-secondary">
                              {t('enterprise.noPermission')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(role.create_time)}</TableCell>
                      <TableCell className="text-right">
                        <RoleRowActions
                          role={role}
                          onEdit={handleEditRole}
                          onDelete={handleShowDeleteRole}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty columnsLength={5} />
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </article>

      {roleDialog && (
        <RoleDialog
          mode={roleDialog.mode}
          role={roleDialog.editTarget}
          permissions={permissions}
          loading={createRoleMutation.isPending || updateRoleMutation.isPending}
          hideModal={hideRoleDialog}
          onOk={handleRoleDialogOk}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteRoleTarget)}
        onOpenChange={hideDeleteRoleDialog}
        title={t('enterprise.deleteRoleTitle')}
        content={{
          title: deleteRoleTarget?.name,
          node: (
            <div className="text-sm text-text-secondary">
              {t('enterprise.deleteRoleWarn')}
            </div>
          ),
        }}
        onOk={handleDeleteRoleOk}
      />
    </>
  );
}
