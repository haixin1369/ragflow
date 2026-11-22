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
import { useFetchDatasetMembers } from '@/hooks/use-kb-member-request';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { useKnowledgeBaseContext } from '../contexts/knowledge-base-context';

// Resolves what the current user may do inside one knowledge base: owners and
// superusers manage everything; granted members manage content when their row
// (read from the member list) says "edit".
export function useKbManagePermission() {
  const { knowledgeBase } = useKnowledgeBaseContext();
  const { data: userInfo } = useFetchUserInfo();
  const { data: members = [] } = useFetchDatasetMembers(knowledgeBase?.id);

  return useMemo(() => {
    const currentUserId = userInfo?.id ?? '';
    const isSuperuser = Boolean(userInfo?.is_superuser);
    // The backend resolves the owner as COALESCE(user_id, created_by).
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
      // Member/content management (folders, moves, uploads stay function-gated).
      canManage: isOwner || isSuperuser || isEditor,
      // Member-list management (the dialog entry, grants, transfers).
      canManageMembers: isOwner || isSuperuser,
      datasetId: knowledgeBase?.id ?? '',
    };
  }, [userInfo, knowledgeBase, members]);
}
