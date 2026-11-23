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

import request from '@/utils/next-request';
import type { EnterpriseDepartment } from '@/services/enterprise-service';

const ApiPrefix = '/api/v1';

export const enum DatasetMemberPermission {
  View = 'view',
  Edit = 'edit',
}

export interface DatasetMember {
  user_id: string;
  email: string;
  nickname: string;
  permission: DatasetMemberPermission;
  create_time: number;
}

export interface MemberCandidateUser {
  user_id: string;
  email: string;
  nickname: string;
  department_id: string;
}

export interface MemberCandidates {
  departments: EnterpriseDepartment[];
  users: MemberCandidateUser[];
}

export interface DatasetMembersBatchResult {
  added: number;
  failed: { user_id: string; reason: string }[];
}

export interface DatasetMemberListResponse {
  code: number;
  message: string;
  data: DatasetMember[];
  total?: number;
}

export interface DatasetMemberResponse<T = null> {
  code: number;
  message: string;
  data: T;
}

export interface SetDatasetMemberParams {
  user_id: string;
  permission: DatasetMemberPermission;
}

export const kbMemberService = {
  listMembers: (datasetId: string) =>
    request.get<DatasetMemberListResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/members`,
    ),
  setMember: (datasetId: string, params: SetDatasetMemberParams) =>
    request.put<DatasetMemberResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/members`,
      params,
    ),
  // Organization-structure data behind the batch-add dialog: departments plus
  // every grantable user with their department assignment.
  fetchMemberCandidates: (datasetId: string) =>
    request.get<DatasetMemberResponse<MemberCandidates>>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/members/candidates`,
    ),
  // Grants one permission level to many users at once; per-target failures
  // come back in the payload instead of failing the request.
  setMembersBatch: (
    datasetId: string,
    params: { members: string[]; permission: DatasetMemberPermission },
  ) =>
    request.put<DatasetMemberResponse<DatasetMembersBatchResult>>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/members/batch`,
      params,
    ),
  removeMember: (datasetId: string, userId: string) =>
    request.delete<DatasetMemberResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/members/${encodeURIComponent(userId)}`,
    ),
  // Admin-prefix ownership transfer, driven by the superuser from the
  // member dialog; uses the same request wrapper as the admin service layer.
  transferOwnership: (kbId: string, targetUserId: string) =>
    request.post<DatasetMemberResponse>(
      `/api/v1/admin/knowledgebases/${encodeURIComponent(kbId)}/transfer`,
      { target_user_id: targetUserId },
    ),
};
