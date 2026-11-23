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
  useFetchDatasetMembers,
  useRemoveDatasetMember,
  useSetDatasetMember,
  useSetDatasetMembersBatch,
  useTransferDatasetOwnership,
} from '@/hooks/use-kb-member-request';
import message from '@/components/ui/message';
import i18n from '@/locales/config';
import {
  DatasetMember,
  DatasetMemberPermission,
} from '@/services/kb-member-service';
import { Trash2, UserPlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKbManagePermission } from './hooks/use-kb-manage-permission';
import { OrgMemberSelector } from './org-member-selector';

interface MemberManagementDialogProps {
  datasetId: string;
  hideModal: () => void;
}

const PermissionOptions = [
  DatasetMemberPermission.View,
  DatasetMemberPermission.Edit,
];

function MemberPermissionSelect({
  member,
  onChange,
  disabled,
}: {
  member: DatasetMember;
  onChange: (permission: DatasetMemberPermission) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const handleValueChange = useCallback(
    (value: string) => {
      onChange(value as DatasetMemberPermission);
    },
    [onChange],
  );

  return (
    <Select
      value={member.permission}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PermissionOptions.map((permission) => (
          <SelectItem key={permission} value={permission}>
            {permission === DatasetMemberPermission.View
              ? t('kbMember.permissionView')
              : t('kbMember.permissionEdit')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MemberManagementDialog({
  datasetId,
  hideModal,
}: MemberManagementDialogProps) {
  const { t } = useTranslation();
  const { isSuperuser } = useKbManagePermission();
  const { data: members = [], isPending: membersLoading } =
    useFetchDatasetMembers(datasetId);

  const setMemberMutation = useSetDatasetMember(datasetId);
  const removeMemberMutation = useRemoveDatasetMember(datasetId);
  const transferMutation = useTransferDatasetOwnership(datasetId);
  const batchMutation = useSetDatasetMembersBatch(datasetId);

  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferConfirmVisible, setTransferConfirmVisible] = useState(false);
  const [orgSelectorVisible, setOrgSelectorVisible] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const showOrgSelector = useCallback(() => {
    setOrgSelectorVisible(true);
  }, []);

  const hideOrgSelector = useCallback(() => {
    setOrgSelectorVisible(false);
  }, []);

  const handleOrgConfirm = useCallback(
    (userIds: string[], permission: DatasetMemberPermission) => {
      batchMutation.mutate(
        { members: userIds, permission },
        {
          onSuccess: (response) => {
            const { added, failed } = response.data;
            if (added > 0) {
              message.success(i18n.t('kbMember.batchResult', { added }));
            }
            if (failed.length) {
              message.warning(
                i18n.t('kbMember.batchFailed', { count: failed.length }),
              );
            }
            hideOrgSelector();
          },
        },
      );
    },
    [batchMutation, hideOrgSelector],
  );

  const handleMemberPermissionChange = useCallback(
    (member: DatasetMember, permission: DatasetMemberPermission) => {
      setMemberMutation.mutate({ user_id: member.user_id, permission });
    },
    [setMemberMutation],
  );

  const handleRemoveMember = useCallback(
    (member: DatasetMember) => {
      removeMemberMutation.mutate(member.user_id);
    },
    [removeMemberMutation],
  );

  const handleTransferTargetChange = useCallback((value: string) => {
    setTransferTargetId(value);
  }, []);

  const showTransferConfirm = useCallback(() => {
    if (!transferTargetId) {
      return;
    }
    setTransferConfirmVisible(true);
  }, [transferTargetId]);

  const hideTransferConfirm = useCallback(() => {
    setTransferConfirmVisible(false);
  }, []);

  const handleTransferConfirm = useCallback(() => {
    if (!transferTargetId) {
      return;
    }
    transferMutation.mutate(transferTargetId, {
      onSuccess: () => {
        setTransferConfirmVisible(false);
        hideModal();
      },
    });
  }, [transferTargetId, transferMutation, hideModal]);

  const transferTarget = members.find(
    (member) => member.user_id === transferTargetId,
  );

  return (
    <>
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader className="min-w-0">
            <DialogTitle className="truncate">
              {t('kbMember.memberManagement')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button className="shrink-0" onClick={showOrgSelector}>
              <UserPlus className="size-[1em]" />
              {t('kbMember.addMember')}
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">
                    {t('enterprise.nickname')}
                  </TableHead>
                  <TableHead className="w-2/5">
                    {t('enterprise.email')}
                  </TableHead>
                  <TableHead className="w-1/5">
                    {t('kbMember.permission')}
                  </TableHead>
                  <TableHead className="w-16 text-right">
                    {t('enterprise.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading && !members.length ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex justify-center py-6">
                        <Spin size="large" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : members.length ? (
                  members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <span
                          className="block max-w-32 truncate"
                          title={member.nickname}
                        >
                          {member.nickname}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="block max-w-52 truncate"
                          title={member.email}
                        >
                          {member.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <MemberPermissionSelect
                          member={member}
                          disabled={setMemberMutation.isPending}
                          onChange={(permission) =>
                            handleMemberPermissionChange(member, permission)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDeleteDialog
                          title={t('kbMember.removeMemberTitle')}
                          content={{
                            title: member.email,
                            node: (
                              <div className="text-sm text-text-secondary">
                                {t('kbMember.removeMemberWarn')}
                              </div>
                            ),
                          }}
                          onOk={() => handleRemoveMember(member)}
                        >
                          <Button
                            variant="delete"
                            size="icon-sm"
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-text-secondary py-6"
                    >
                      {t('kbMember.memberEmpty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {isSuperuser && (
            <div className="flex items-center gap-2 border-t-0.5 border-border-button pt-4">
              <span className="text-sm text-text-secondary shrink-0">
                {t('kbMember.transferOwnership')}
              </span>
              <Select
                value={transferTargetId}
                onValueChange={handleTransferTargetChange}
              >
                <SelectTrigger className="flex-1 min-w-0">
                  <SelectValue
                    placeholder={t('kbMember.transferTargetPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <span className="block max-w-56 truncate">
                        {member.nickname}（{member.email}）
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="shrink-0"
                loading={transferMutation.isPending}
                disabled={!transferTargetId}
                onClick={showTransferConfirm}
              >
                {t('kbMember.transferOwnership')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {transferConfirmVisible && (
        <Dialog open onOpenChange={hideTransferConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className="min-w-0">
              <DialogTitle className="truncate">
                {t('kbMember.transferConfirmTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-text-secondary break-words">
              {t('kbMember.transferConfirmWarn', {
                name: transferTarget
                  ? `${transferTarget.nickname}（${transferTarget.email}）`
                  : '',
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={hideTransferConfirm}>
                {t('common.cancel')}
              </Button>
              <Button
                loading={transferMutation.isPending}
                onClick={handleTransferConfirm}
              >
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {orgSelectorVisible && (
        <OrgMemberSelector
          datasetId={datasetId}
          hideModal={hideOrgSelector}
          onConfirm={handleOrgConfirm}
          loading={batchMutation.isPending}
        />
      )}
    </>
  );
}
