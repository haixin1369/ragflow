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

import { useMemo } from 'react';
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/use-knowledge-request';
import { useFetchDatasetMembers } from '@/hooks/use-kb-member-request';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { IDataset } from '@/interfaces/database/dataset';
import { useKnowledgeBaseContext } from '../contexts/knowledge-base-context';

interface KbManagePermissionInput {
  userInfo?: { id?: string; is_superuser?: boolean };
  knowledgeBase?: Pick<IDataset, 'id' | 'user_id' | 'created_by'> | null;
  members?: Array<{ user_id: string; permission: string }>;
}

interface KbManagePermission {
  currentUserId: string;
  isSuperuser: boolean;
  isOwner: boolean;
  isEditor: boolean;
  // Member/content management (folders, moves, uploads stay function-gated).
  canManage: boolean;
  // Knowledge-base-level management (configuration, member dialog, grants,
  // transfers): reserved to the creator and the superuser.
  canManageMembers: boolean;
  datasetId: string;
}

// Owner resolution mirrors the backend's COALESCE(user_id, created_by).
function computeKbManagePermission({
  userInfo,
  knowledgeBase,
  members = [],
}: KbManagePermissionInput): KbManagePermission {
  const currentUserId = userInfo?.id ?? '';
  const isSuperuser = Boolean(userInfo?.is_superuser);
  const ownerId = knowledgeBase?.user_id || knowledgeBase?.created_by || '';
  const isOwner = !!currentUserId && !!ownerId && ownerId === currentUserId;
  const isEditor = members.some(
    (member) =>
      member.user_id === currentUserId && member.permission === 'edit',
  );

  return {
    currentUserId,
    isSuperuser,
    isOwner,
    isEditor,
    canManage: isOwner || isSuperuser || isEditor,
    canManageMembers: isOwner || isSuperuser,
    datasetId: knowledgeBase?.id ?? '',
  };
}

// Resolves what the current user may do inside the knowledge base from the
// dataset layout context.
export function useKbManagePermission() {
  const { knowledgeBase } = useKnowledgeBaseContext();
  const { data: userInfo } = useFetchUserInfo();
  const { data: members = [] } = useFetchDatasetMembers(knowledgeBase?.id);

  return useMemo(
    () => computeKbManagePermission({ userInfo, knowledgeBase, members }),
    [userInfo, knowledgeBase, members],
  );
}

// Same resolution for pages outside the KnowledgeBaseProvider (the chunk
// page), which only know the dataset id from the route query.
export function useKbManagePermissionForDataset(datasetId?: string) {
  const { data: knowledgeBase } = useFetchKnowledgeBaseConfiguration();
  const { data: userInfo } = useFetchUserInfo();
  const { data: members = [] } = useFetchDatasetMembers(
    datasetId || knowledgeBase?.id,
  );

  return useMemo(
    () => computeKbManagePermission({ userInfo, knowledgeBase, members }),
    [userInfo, knowledgeBase, members],
  );
}
