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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import message from '@/components/ui/message';
import i18n from '@/locales/config';
import { KnowledgeApiAction } from '@/hooks/use-knowledge-request';
import {
  kbMemberService,
  type DatasetMemberPermission,
  type DatasetMemberResponse,
  type MemberCandidates,
  type SetDatasetMemberParams,
} from '@/services/kb-member-service';

export const enum KbMemberApiAction {
  DatasetMembers = 'datasetMembers',
  DatasetMemberCandidates = 'datasetMemberCandidates',
}

export const KbMemberKeys = {
  members: (datasetId: string) =>
    [KbMemberApiAction.DatasetMembers, datasetId] as const,
  memberCandidates: (datasetId: string) =>
    [KbMemberApiAction.DatasetMemberCandidates, datasetId] as const,
};

async function unwrap<T>(
  promise: Promise<AxiosResponse<DatasetMemberResponse<T>>>,
): Promise<DatasetMemberResponse<T>> {
  const { data } = await promise;
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  return data;
}

// The member list doubles as the per-user permission source for the folder
// panel, so failures degrade to an empty list instead of error banners; the
// axios interceptor still surfaces the backend message where it matters.
export const useFetchDatasetMembers = (datasetId?: string) => {
  return useQuery({
    queryKey: KbMemberKeys.members(datasetId ?? ''),
    enabled: !!datasetId,
    queryFn: async () => {
      try {
        const { data } = await kbMemberService.listMembers(datasetId!);
        if (data.code !== 0) {
          return [];
        }
        return data.data ?? [];
      } catch {
        return [];
      }
    },
  });
};

const useInvalidateDatasetMembers = () => {
  const queryClient = useQueryClient();

  return {
    invalidateMembers: (datasetId: string) =>
      queryClient.invalidateQueries({
        queryKey: KbMemberKeys.members(datasetId),
      }),
  };
};

export const useSetDatasetMember = (datasetId: string) => {
  const { invalidateMembers } = useInvalidateDatasetMembers();

  return useMutation({
    mutationFn: (params: SetDatasetMemberParams) =>
      unwrap(kbMemberService.setMember(datasetId, params)),
    onSuccess: () => {
      message.success(i18n.t('message.operated'));
      invalidateMembers(datasetId);
    },
  });
};

// The organization-structure data behind the batch-add dialog; loaded only
// while the selector dialog is open.
export const useFetchMemberCandidates = (datasetId: string, enabled: boolean) => {
  return useQuery({
    queryKey: KbMemberKeys.memberCandidates(datasetId),
    enabled: enabled && !!datasetId,
    queryFn: async (): Promise<MemberCandidates> => {
      const { data } = await kbMemberService.fetchMemberCandidates(datasetId);
      if (data.code !== 0) {
        throw new Error(data.message);
      }
      return data.data;
    },
  });
};

export const useSetDatasetMembersBatch = (datasetId: string) => {
  const { invalidateMembers } = useInvalidateDatasetMembers();

  return useMutation({
    mutationFn: (params: {
      members: string[];
      permission: DatasetMemberPermission;
    }) => unwrap(kbMemberService.setMembersBatch(datasetId, params)),
    onSuccess: () => {
      invalidateMembers(datasetId);
    },
  });
};

export const useRemoveDatasetMember = (datasetId: string) => {
  const { invalidateMembers } = useInvalidateDatasetMembers();

  return useMutation({
    mutationFn: (userId: string) =>
      unwrap(kbMemberService.removeMember(datasetId, userId)),
    onSuccess: () => {
      message.success(i18n.t('message.deleted'));
      invalidateMembers(datasetId);
    },
  });
};

export const useTransferDatasetOwnership = (datasetId: string) => {
  const queryClient = useQueryClient();
  const { invalidateMembers } = useInvalidateDatasetMembers();

  return useMutation({
    mutationFn: (targetUserId: string) =>
      unwrap(kbMemberService.transferOwnership(datasetId, targetUserId)),
    onSuccess: () => {
      message.success(i18n.t('message.operated'));
      invalidateMembers(datasetId);
      // The KB row changes owner; refresh the detail and list caches so the
      // ownership-dependent UI follows.
      queryClient.invalidateQueries({
        queryKey: [KnowledgeApiAction.FetchKnowledgeDetail],
      });
      queryClient.invalidateQueries({
        queryKey: [KnowledgeApiAction.FetchKnowledgeListByPage],
      });
    },
  });
};
