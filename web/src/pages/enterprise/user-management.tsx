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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/input';
import { RAGFlowPagination } from '@/components/ui/ragflow-pagination';
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
  useAssignEnterpriseUserDepartment,
  useAssignEnterpriseUserRole,
  useCreateEnterpriseDepartment,
  useCreateEnterpriseUser,
  useDeleteEnterpriseDepartment,
  useDeleteEnterpriseUser,
  useFetchEnterpriseDepartments,
  useFetchEnterpriseRoles,
  useFetchEnterpriseUsers,
  useUpdateEnterpriseDepartment,
  useUpdateEnterpriseUserActivateStatus,
} from '@/hooks/use-enterprise-request';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import {
  isEnterpriseUserActive,
  type EnterpriseDepartment,
  type EnterpriseUser,
} from '@/services/enterprise-service';
import { rsaPsw } from '@/utils';
import { formatDate } from '@/utils/date';
import { useDebounce } from 'ahooks';
import {
  LucideBuilding2,
  LucidePlus,
  LucidePower,
  LucideShieldCheck,
  LucideTrash2,
  LucideUserPlus,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreateUserDialog,
  type CreateUserFormValues,
} from './create-user-dialog';
import { DepartmentDialog, DepartmentDialogMode } from './department-dialog';
import { DepartmentMoveDialog } from './department-move-dialog';
import { DepartmentTree } from './department-tree';
import { UserAssignDialog, UserAssignType } from './user-assign-dialog';

const UserListPageSize = 10;

interface UserRowActionsProps {
  user: EnterpriseUser;
  isSelf: boolean;
  onAssignDepartment: (user: EnterpriseUser) => void;
  onAssignRole: (user: EnterpriseUser) => void;
  onToggleActivate: (user: EnterpriseUser) => void;
  onDelete: (user: EnterpriseUser) => void;
}

function UserRowActions({
  user,
  isSelf,
  onAssignDepartment,
  onAssignRole,
  onToggleActivate,
  onDelete,
}: UserRowActionsProps) {
  const { t } = useTranslation();
  const active = isEnterpriseUserActive(user.is_active);

  const handleAssignDepartment = useCallback(
    () => onAssignDepartment(user),
    [onAssignDepartment, user],
  );
  const handleAssignRole = useCallback(
    () => onAssignRole(user),
    [onAssignRole, user],
  );
  const handleToggleActivate = useCallback(
    () => onToggleActivate(user),
    [onToggleActivate, user],
  );
  const handleDelete = useCallback(() => onDelete(user), [onDelete, user]);

  return (
    <div className="flex items-center gap-0.5">
      <RAGFlowTooltip asChild tooltip={t('enterprise.assignDepartment')}>
        <Button variant="ghost" size="icon-sm" onClick={handleAssignDepartment}>
          <LucideBuilding2 className="size-4" />
        </Button>
      </RAGFlowTooltip>
      <RAGFlowTooltip asChild tooltip={t('enterprise.assignRole')}>
        <Button variant="ghost" size="icon-sm" onClick={handleAssignRole}>
          <LucideShieldCheck className="size-4" />
        </Button>
      </RAGFlowTooltip>
      {!isSelf && (
        <>
          <RAGFlowTooltip
            asChild
            tooltip={active ? t('enterprise.disable') : t('enterprise.enable')}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleActivate}
            >
              <LucidePower className="size-4" />
            </Button>
          </RAGFlowTooltip>
          <RAGFlowTooltip asChild tooltip={t('common.delete')}>
            <Button variant="delete" size="icon-sm" onClick={handleDelete}>
              <LucideTrash2 className="size-4" />
            </Button>
          </RAGFlowTooltip>
        </>
      )}
    </div>
  );
}

export default function UserManagement() {
  const { t } = useTranslation();
  const {
    data: { email: selfEmail },
  } = useFetchUserInfo();

  const [searchString, setSearchString] = useState('');
  const keyword = useDebounce(searchString, { wait: 500 });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: UserListPageSize,
  });

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword,
    }),
    [pagination.page, pagination.pageSize, keyword],
  );

  const { data: users, isLoading: usersLoading } =
    useFetchEnterpriseUsers(queryParams);
  const { data: departments = [] } = useFetchEnterpriseDepartments();
  const { data: roles = [] } = useFetchEnterpriseRoles();

  // Dialog state
  const [departmentDialog, setDepartmentDialog] = useState<{
    mode: DepartmentDialogMode;
    // The department to rename; undefined in create mode.
    renameTarget?: EnterpriseDepartment;
    // The parent department for create; undefined creates a root department.
    parent?: EnterpriseDepartment;
  } | null>(null);
  const [moveDepartmentTarget, setMoveDepartmentTarget] =
    useState<EnterpriseDepartment | null>(null);
  const [deleteDepartmentTarget, setDeleteDepartmentTarget] =
    useState<EnterpriseDepartment | null>(null);
  const [createUserVisible, setCreateUserVisible] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    type: UserAssignType;
    user: EnterpriseUser;
  } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] =
    useState<EnterpriseUser | null>(null);

  // Mutations
  const createDepartmentMutation = useCreateEnterpriseDepartment();
  const updateDepartmentMutation = useUpdateEnterpriseDepartment();
  const deleteDepartmentMutation = useDeleteEnterpriseDepartment();
  const createUserMutation = useCreateEnterpriseUser();
  const assignDepartmentMutation = useAssignEnterpriseUserDepartment();
  const assignRoleMutation = useAssignEnterpriseUserRole();
  const updateActivateStatusMutation = useUpdateEnterpriseUserActivateStatus();
  const deleteUserMutation = useDeleteEnterpriseUser();

  // Header handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchString(e.target.value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setPagination((prev) => ({
      page,
      pageSize: pageSize ?? prev.pageSize,
    }));
  }, []);

  const showCreateUserDialog = useCallback(() => {
    setCreateUserVisible(true);
  }, []);

  // Department handlers
  const showAddRootDepartment = useCallback(() => {
    setDepartmentDialog({ mode: DepartmentDialogMode.Create });
  }, []);

  const handleAddChildDepartment = useCallback(
    (parent: EnterpriseDepartment) => {
      setDepartmentDialog({
        mode: DepartmentDialogMode.Create,
        parent,
      });
    },
    [],
  );

  const handleRenameDepartment = useCallback(
    (department: EnterpriseDepartment) => {
      setDepartmentDialog({
        mode: DepartmentDialogMode.Rename,
        renameTarget: department,
      });
    },
    [],
  );

  const handleMoveDepartment = useCallback(
    (department: EnterpriseDepartment) => {
      setMoveDepartmentTarget(department);
    },
    [],
  );

  const handleShowDeleteDepartment = useCallback(
    (department: EnterpriseDepartment) => {
      setDeleteDepartmentTarget(department);
    },
    [],
  );

  const hideDepartmentDialog = useCallback(() => {
    setDepartmentDialog(null);
  }, []);

  const handleDepartmentDialogOk = useCallback(
    (name: string) => {
      if (!departmentDialog) {
        return;
      }
      if (departmentDialog.mode === DepartmentDialogMode.Create) {
        createDepartmentMutation.mutate(
          { name, parent_id: departmentDialog.parent?.id ?? '' },
          { onSuccess: hideDepartmentDialog },
        );
        return;
      }
      updateDepartmentMutation.mutate(
        {
          departmentId: departmentDialog.renameTarget!.id,
          params: { name },
        },
        { onSuccess: hideDepartmentDialog },
      );
    },
    [
      departmentDialog,
      createDepartmentMutation,
      updateDepartmentMutation,
      hideDepartmentDialog,
    ],
  );

  const hideMoveDepartmentDialog = useCallback(() => {
    setMoveDepartmentTarget(null);
  }, []);

  const handleMoveDepartmentOk = useCallback(
    (parentId: string) => {
      if (!moveDepartmentTarget) {
        return;
      }
      updateDepartmentMutation.mutate(
        {
          departmentId: moveDepartmentTarget.id,
          params: { parent_id: parentId },
        },
        { onSuccess: hideMoveDepartmentDialog },
      );
    },
    [moveDepartmentTarget, updateDepartmentMutation, hideMoveDepartmentDialog],
  );

  const hideDeleteDepartmentDialog = useCallback(() => {
    setDeleteDepartmentTarget(null);
  }, []);

  const handleDeleteDepartmentOk = useCallback(() => {
    if (!deleteDepartmentTarget) {
      return;
    }
    deleteDepartmentMutation.mutate(deleteDepartmentTarget.id, {
      onSuccess: hideDeleteDepartmentDialog,
    });
  }, [
    deleteDepartmentTarget,
    deleteDepartmentMutation,
    hideDeleteDepartmentDialog,
  ]);

  // User handlers
  const hideCreateUserDialog = useCallback(() => {
    setCreateUserVisible(false);
  }, []);

  const handleCreateUserOk = useCallback(
    (values: CreateUserFormValues) => {
      createUserMutation.mutate(
        {
          username: values.email,
          password: rsaPsw(values.password) as string,
          department_id: values.departmentId || undefined,
          role_id: values.roleId || undefined,
        },
        { onSuccess: hideCreateUserDialog },
      );
    },
    [createUserMutation, hideCreateUserDialog],
  );

  const handleAssignDepartment = useCallback((user: EnterpriseUser) => {
    setAssignTarget({ type: UserAssignType.Department, user });
  }, []);

  const handleAssignRole = useCallback((user: EnterpriseUser) => {
    setAssignTarget({ type: UserAssignType.Role, user });
  }, []);

  const hideAssignDialog = useCallback(() => {
    setAssignTarget(null);
  }, []);

  const handleAssignOk = useCallback(
    (value: string) => {
      if (!assignTarget) {
        return;
      }
      const { type, user } = assignTarget;
      if (type === UserAssignType.Department) {
        assignDepartmentMutation.mutate(
          { username: user.email, departmentId: value },
          { onSuccess: hideAssignDialog },
        );
        return;
      }
      assignRoleMutation.mutate(
        { username: user.email, roleId: value },
        { onSuccess: hideAssignDialog },
      );
    },
    [
      assignTarget,
      assignDepartmentMutation,
      assignRoleMutation,
      hideAssignDialog,
    ],
  );

  const handleToggleActivate = useCallback(
    (user: EnterpriseUser) => {
      updateActivateStatusMutation.mutate({
        username: user.email,
        isActive: !isEnterpriseUserActive(user.is_active),
      });
    },
    [updateActivateStatusMutation],
  );

  const handleShowDeleteUser = useCallback((user: EnterpriseUser) => {
    setDeleteUserTarget(user);
  }, []);

  const hideDeleteUserDialog = useCallback(() => {
    setDeleteUserTarget(null);
  }, []);

  const handleDeleteUserOk = useCallback(() => {
    if (!deleteUserTarget) {
      return;
    }
    deleteUserMutation.mutate(deleteUserTarget.email, {
      onSuccess: hideDeleteUserDialog,
    });
  }, [deleteUserTarget, deleteUserMutation, hideDeleteUserDialog]);

  const userItems = users?.items ?? [];

  return (
    <>
      <article
        className="flex size-full min-w-0 flex-col"
        data-testid="user-management"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
          <SearchInput
            value={searchString}
            onChange={handleSearchChange}
            placeholder={t('enterprise.searchUserPlaceholder')}
            className="w-64"
          />
          <Button onClick={showCreateUserDialog}>
            <LucideUserPlus className="size-[1em]" />
            {t('enterprise.createUser')}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5 pt-4">
          <Card className="w-64 shrink-0">
            <CardHeader className="border-b border-border-button py-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="truncate">{t('enterprise.organization')}</span>
                <RAGFlowTooltip asChild tooltip={t('enterprise.addDepartment')}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={showAddRootDepartment}
                  >
                    <LucidePlus className="size-4" />
                  </Button>
                </RAGFlowTooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 overflow-auto p-2">
              <DepartmentTree
                departments={departments}
                onAddChild={handleAddChildDepartment}
                onRename={handleRenameDepartment}
                onMove={handleMoveDepartment}
                onDelete={handleShowDeleteDepartment}
              />
            </CardContent>
          </Card>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/5">
                      {t('enterprise.email')}
                    </TableHead>
                    <TableHead className="w-1/6">
                      {t('enterprise.nickname')}
                    </TableHead>
                    <TableHead className="w-1/6">
                      {t('enterprise.department')}
                    </TableHead>
                    <TableHead className="w-1/6">
                      {t('enterprise.role')}
                    </TableHead>
                    <TableHead className="w-24">
                      {t('enterprise.status')}
                    </TableHead>
                    <TableHead className="w-1/5">
                      {t('enterprise.createTime')}
                    </TableHead>
                    <TableHead className="w-32 text-right">
                      {t('enterprise.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading && !userItems.length ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex justify-center py-8">
                          <Spin size="large" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : userItems.length ? (
                    userItems.map((user) => (
                      <TableRow key={user.email} className="group/row">
                        <TableCell className="min-w-0">
                          <span
                            className="block max-w-48 truncate"
                            title={user.email}
                          >
                            {user.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-32 truncate"
                            title={user.nickname}
                          >
                            {user.nickname}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-32 truncate"
                            title={user.department_name}
                          >
                            {user.department_name ||
                              t('enterprise.noDepartment')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-32 truncate"
                            title={user.role_name}
                          >
                            {user.role_name || t('enterprise.noRole')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isEnterpriseUserActive(user.is_active)
                                ? 'success'
                                : 'destructive'
                            }
                          >
                            {isEnterpriseUserActive(user.is_active)
                              ? t('enterprise.active')
                              : t('enterprise.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.create_date)}</TableCell>
                        <TableCell className="text-right">
                          <UserRowActions
                            user={user}
                            isSelf={user.email === selfEmail}
                            onAssignDepartment={handleAssignDepartment}
                            onAssignRole={handleAssignRole}
                            onToggleActivate={handleToggleActivate}
                            onDelete={handleShowDeleteUser}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableEmpty columnsLength={7} />
                  )}
                </TableBody>
              </Table>
            </div>
            <footer className="shrink-0 pt-3">
              <RAGFlowPagination
                current={pagination.page}
                pageSize={pagination.pageSize}
                total={users?.total ?? 0}
                onChange={handlePageChange}
              />
            </footer>
          </div>
        </div>
      </article>

      {departmentDialog && (
        <DepartmentDialog
          mode={departmentDialog.mode}
          department={departmentDialog.renameTarget}
          loading={
            createDepartmentMutation.isPending ||
            updateDepartmentMutation.isPending
          }
          hideModal={hideDepartmentDialog}
          onOk={handleDepartmentDialogOk}
        />
      )}
      {moveDepartmentTarget && (
        <DepartmentMoveDialog
          department={moveDepartmentTarget}
          departments={departments}
          loading={updateDepartmentMutation.isPending}
          hideModal={hideMoveDepartmentDialog}
          onOk={handleMoveDepartmentOk}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteDepartmentTarget)}
        onOpenChange={hideDeleteDepartmentDialog}
        title={t('enterprise.deleteDepartmentTitle')}
        content={{
          title: deleteDepartmentTarget?.name,
          node: (
            <div className="text-sm text-text-secondary">
              {t('enterprise.deleteDepartmentWarn')}
            </div>
          ),
        }}
        onOk={handleDeleteDepartmentOk}
      />
      {createUserVisible && (
        <CreateUserDialog
          departments={departments}
          roles={roles}
          loading={createUserMutation.isPending}
          hideModal={hideCreateUserDialog}
          onOk={handleCreateUserOk}
        />
      )}
      {assignTarget && (
        <UserAssignDialog
          type={assignTarget.type}
          username={assignTarget.user.email}
          options={
            assignTarget.type === UserAssignType.Department
              ? departments.map((department) => ({
                  id: department.id,
                  name: department.name,
                }))
              : roles.map((role) => ({ id: role.id, name: role.name }))
          }
          currentId={
            assignTarget.type === UserAssignType.Department
              ? assignTarget.user.department_id
              : assignTarget.user.role_id
          }
          loading={
            assignDepartmentMutation.isPending || assignRoleMutation.isPending
          }
          hideModal={hideAssignDialog}
          onOk={handleAssignOk}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteUserTarget)}
        onOpenChange={hideDeleteUserDialog}
        title={t('enterprise.deleteUserTitle')}
        content={{
          title: deleteUserTarget?.email,
          node: (
            <div className="text-sm text-text-secondary">
              {t('enterprise.deleteUserWarn')}
            </div>
          ),
        }}
        onOk={handleDeleteUserOk}
      />
    </>
  );
}
