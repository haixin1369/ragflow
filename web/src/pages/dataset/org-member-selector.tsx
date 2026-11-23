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

import { collectDepartmentSubtreeIds } from '@/components/department-tree/department-utils';
import {
  DepartmentTree,
} from '@/components/department-tree/department-tree';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/input';
import { Radio } from '@/components/ui/radio';
import { Spin } from '@/components/ui/spin';
import { useFetchMemberCandidates } from '@/hooks/use-kb-member-request';
import type { EnterpriseDepartment } from '@/services/enterprise-service';
import {
  type MemberCandidateUser,
  DatasetMemberPermission,
} from '@/services/kb-member-service';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OrgMemberSelectorProps {
  datasetId: string;
  hideModal: () => void;
  onConfirm: (userIds: string[], permission: DatasetMemberPermission) => void;
  loading: boolean;
}

export function OrgMemberSelector({
  datasetId,
  hideModal,
  onConfirm,
  loading,
}: OrgMemberSelectorProps) {
  const { t } = useTranslation();
  const { data: candidates, isPending: candidatesLoading } =
    useFetchMemberCandidates(datasetId, true);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | undefined
  >(undefined);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set());
  const [permission, setPermission] = useState<DatasetMemberPermission>(
    DatasetMemberPermission.View,
  );

  const treeDepartments = candidates?.departments ?? [];

  // Selecting a department includes its sub-departments; the keyword filters
  // the subtree by nickname or email, both case-insensitively. With no
  // department selected, searching falls back to the root — every candidate.
  const departmentUsers = useMemo(() => {
    const users = candidates?.users ?? [];
    const keyword = searchKeyword.trim().toLowerCase();
    if (!selectedDepartmentId) {
      if (!keyword) {
        return [];
      }
      return users.filter(
        (user) =>
          user.nickname.toLowerCase().includes(keyword) ||
          user.email.toLowerCase().includes(keyword),
      );
    }
    const departmentIds = collectDepartmentSubtreeIds(
      candidates?.departments ?? [],
      selectedDepartmentId,
    );
    return users.filter((user) => {
      if (!departmentIds.has(user.department_id)) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        user.nickname.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      );
    });
  }, [candidates, selectedDepartmentId, searchKeyword]);

  const allDepartmentUsersChecked =
    departmentUsers.length > 0 &&
    departmentUsers.every((user) => checkedUserIds.has(user.user_id));

  const handleDepartmentSelect = useCallback(
    (department: EnterpriseDepartment) => {
      setSelectedDepartmentId(department.id);
    },
    [],
  );

  const handleSearchKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(e.target.value);
    },
    [],
  );

  const handleToggleUser = useCallback(
    (userId: string, checked: boolean) => {
      setCheckedUserIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleAll = useCallback(
    (checked: boolean | string) => {
      setCheckedUserIds((prev) => {
        const next = new Set(prev);
        for (const user of departmentUsers) {
          if (checked) {
            next.add(user.user_id);
          } else {
            next.delete(user.user_id);
          }
        }
        return next;
      });
    },
    [departmentUsers],
  );

  const handlePermissionChange = useCallback((value: string | number) => {
    setPermission(value as DatasetMemberPermission);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!checkedUserIds.size) {
      return;
    }
    onConfirm([...checkedUserIds], permission);
  }, [checkedUserIds, permission, onConfirm]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[820px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('kbMember.addMember')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-80 gap-4">
          <div className="w-56 shrink-0 overflow-auto rounded border border-border-button p-1">
            {candidatesLoading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : (
              <DepartmentTree
                departments={treeDepartments}
                selectedId={selectedDepartmentId}
                onSelect={handleDepartmentSelect}
                showActions={false}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <SearchInput
              value={searchKeyword}
              onChange={handleSearchKeywordChange}
              placeholder={t('kbMember.searchMemberPlaceholder')}
              className="mb-2"
            />
            <div className="flex items-center justify-between gap-2 pb-2">
              <label className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
                <Checkbox
                  checked={allDepartmentUsersChecked}
                  onCheckedChange={handleToggleAll}
                  disabled={!departmentUsers.length}
                />
                <span className="truncate">
                  {t('kbMember.departmentMembers', {
                    count: departmentUsers.length,
                  })}
                </span>
              </label>
              <span className="shrink-0 text-sm text-text-secondary">
                {t('kbMember.selectedCount', {
                  count: checkedUserIds.size,
                })}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded border border-border-button p-1">
              {!selectedDepartmentId ? (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                  {t('kbMember.selectDepartmentFirst')}
                </div>
              ) : departmentUsers.length ? (
                departmentUsers.map((user: MemberCandidateUser) => (
                  <label
                    key={user.user_id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-bg-card"
                  >
                    <Checkbox
                      checked={checkedUserIds.has(user.user_id)}
                      onCheckedChange={(checked) =>
                        handleToggleUser(user.user_id, Boolean(checked))
                      }
                    />
                    <span className="block min-w-0 max-w-40 truncate">
                      {user.nickname}
                    </span>
                    <span className="block min-w-0 flex-1 truncate text-text-secondary">
                      {user.email}
                    </span>
                  </label>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                  {t('kbMember.departmentEmpty')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            {t('kbMember.batchPermissionLabel')}
          </span>
          <Radio.Group
            value={permission}
            onChange={handlePermissionChange}
            className="gap-4"
          >
            <Radio value={DatasetMemberPermission.View}>
              {t('kbMember.permissionView')}
            </Radio>
            <Radio value={DatasetMemberPermission.Edit}>
              {t('kbMember.permissionEdit')}
            </Radio>
          </Radio.Group>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={loading}
            disabled={!checkedUserIds.size}
            onClick={handleConfirm}
          >
            {t('kbMember.batchAdd')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
