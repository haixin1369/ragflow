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

// Mirrors internal/entity/role.go BuiltinFunctionPermissions. The superuser
// receives every code from the backend; role-less users receive an empty list.
// Document actions are governed per knowledge base by its member grants, not
// by role permissions.
export const enum FunctionPermissionCode {
  KbCreate = 'kb.create',
  ChatCreate = 'chat.create',
  AgentCreate = 'agent.create',
  FileManage = 'file.manage',
}

export interface UserPermissionsResponse {
  code: number;
  message: string;
  data: { permissions: string[] };
}

export const userPermissionService = {
  mePermissions: () =>
    request.get<UserPermissionsResponse>('/api/v1/users/me/permissions'),
};
