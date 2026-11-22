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

const AdminApiPrefix = '/api/v1/admin';

export interface EnterpriseResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface EnterpriseListResponse<T = unknown> {
  code: number;
  message: string;
  data: T[];
  total?: number;
}

export interface EnterpriseDepartment {
  id: string;
  name: string;
  // "" means the department hangs directly under the (virtual) root.
  parent_id: string;
  path: string;
  create_time: number;
}

export interface EnterpriseRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  create_time: number;
  update_time: number;
}

export interface EnterprisePermission {
  code: string;
  name: string;
  description: string;
}

export interface EnterpriseUser {
  email: string;
  nickname: string;
  create_date: number;
  // The backend serializes the DB flag as "1"/"0".
  is_active: boolean | string;
  is_superuser: boolean;
  department_id: string;
  department_name: string;
  role_id: string;
  role_name: string;
}

export interface EnterpriseUserListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'active' | 'inactive';
}

export interface EnterpriseSaveDepartmentParams {
  name: string;
  parent_id: string;
}

export interface EnterpriseMoveDepartmentParams {
  // "" moves the department back to the root.
  parent_id: string;
}

export interface EnterpriseSaveRoleParams {
  name: string;
  description: string;
  permissions: string[];
}

export interface EnterpriseCreateUserParams {
  username: string;
  password: string;
  department_id?: string;
  role_id?: string;
}

export const enterpriseService = {
  // Departments
  listDepartments: () =>
    request.get<EnterpriseListResponse<EnterpriseDepartment>>(
      `${AdminApiPrefix}/departments`,
    ),
  createDepartment: (params: EnterpriseSaveDepartmentParams) =>
    request.post<EnterpriseResponse<EnterpriseDepartment>>(
      `${AdminApiPrefix}/departments`,
      params,
    ),
  updateDepartment: (
    departmentId: string,
    params: Partial<EnterpriseSaveDepartmentParams>,
  ) =>
    request.put<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/departments/${encodeURIComponent(departmentId)}`,
      params,
    ),
  deleteDepartment: (departmentId: string) =>
    request.delete<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/departments/${encodeURIComponent(departmentId)}`,
    ),

  // Roles
  listRoles: () =>
    request.get<EnterpriseListResponse<EnterpriseRole>>(
      `${AdminApiPrefix}/roles`,
    ),
  createRole: (params: EnterpriseSaveRoleParams) =>
    request.post<EnterpriseResponse<EnterpriseRole>>(
      `${AdminApiPrefix}/roles`,
      params,
    ),
  updateRole: (roleId: string, params: EnterpriseSaveRoleParams) =>
    request.put<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/roles/${encodeURIComponent(roleId)}`,
      params,
    ),
  deleteRole: (roleId: string) =>
    request.delete<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/roles/${encodeURIComponent(roleId)}`,
    ),

  // Function permissions
  listPermissions: () =>
    request.get<EnterpriseListResponse<EnterprisePermission>>(
      `${AdminApiPrefix}/permissions`,
    ),

  // Users
  listUsers: (params: EnterpriseUserListParams) =>
    request.get<EnterpriseListResponse<EnterpriseUser>>(
      `${AdminApiPrefix}/users`,
      { params },
    ),
  createUser: (params: EnterpriseCreateUserParams) =>
    request.post<EnterpriseResponse<null>>(`${AdminApiPrefix}/users`, params),
  assignUserDepartment: (username: string, departmentId: string) =>
    request.put<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/users/${encodeURIComponent(username)}/department`,
      { department_id: departmentId },
    ),
  assignUserRole: (username: string, roleId: string) =>
    request.put<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/users/${encodeURIComponent(username)}/role`,
      { role_id: roleId },
    ),
  updateUserActivateStatus: (username: string, isActive: boolean) =>
    request.put<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/users/${encodeURIComponent(username)}/activate`,
      { activate_status: isActive ? 'on' : 'off' },
    ),
  deleteUser: (username: string) =>
    request.delete<EnterpriseResponse<null>>(
      `${AdminApiPrefix}/users/${encodeURIComponent(username)}`,
    ),
};

export const isEnterpriseUserActive = (value: EnterpriseUser['is_active']) =>
  value === true || value === '1';
