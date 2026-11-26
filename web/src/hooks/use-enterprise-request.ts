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

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import {
  enterpriseService,
  type EnterpriseCreateUserParams,
  type EnterpriseDepartment,
  type EnterpriseListResponse,
  type EnterprisePermission,
  type EnterpriseResponse,
  type EnterpriseRole,
  type EnterpriseSaveDepartmentParams,
  type EnterpriseSaveRoleParams,
  type EnterpriseUpdateUserParams,
  type EnterpriseUser,
  type EnterpriseUserListParams,
} from '@/services/enterprise-service';

export const enum EnterpriseApiAction {
  Departments = 'enterpriseDepartments',
  Roles = 'enterpriseRoles',
  Permissions = 'enterprisePermissions',
  Users = 'enterpriseUsers',
}

export const EnterpriseKeys = {
  departments: () => [EnterpriseApiAction.Departments] as const,
  roles: () => [EnterpriseApiAction.Roles] as const,
  permissions: () => [EnterpriseApiAction.Permissions] as const,
  users: (params: EnterpriseUserListParams) =>
    [EnterpriseApiAction.Users, params] as const,
};

// The admin endpoints answer business failures with HTTP 200 and a non-zero
// code; the axios interceptor already toasts the backend message, so unwrap
// turns it into a mutation error without a second notification.
async function unwrap<T>(
  promise: Promise<AxiosResponse<EnterpriseResponse<T>>>,
): Promise<EnterpriseResponse<T>> {
  const { data } = await promise;
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  return data;
}

async function unwrapList<T>(
  promise: Promise<AxiosResponse<EnterpriseListResponse<T>>>,
): Promise<{ items: T[]; total: number }> {
  const { data } = await promise;
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  return { items: data.data ?? [], total: data.total ?? 0 };
}

export const useFetchEnterpriseDepartments = () => {
  return useQuery({
    queryKey: EnterpriseKeys.departments(),
    queryFn: async () => {
      const { items } = await unwrapList<EnterpriseDepartment>(
        enterpriseService.listDepartments(),
      );
      return items;
    },
  });
};

export const useFetchEnterpriseRoles = () => {
  return useQuery({
    queryKey: EnterpriseKeys.roles(),
    queryFn: async () => {
      const { items } = await unwrapList<EnterpriseRole>(
        enterpriseService.listRoles(),
      );
      return items;
    },
  });
};

export const useFetchEnterprisePermissions = () => {
  return useQuery({
    queryKey: EnterpriseKeys.permissions(),
    queryFn: async () => {
      const { items } = await unwrapList<EnterprisePermission>(
        enterpriseService.listPermissions(),
      );
      return items;
    },
  });
};

export const useFetchEnterpriseUsers = (params: EnterpriseUserListParams) => {
  return useQuery({
    queryKey: EnterpriseKeys.users(params),
    queryFn: async () =>
      unwrapList<EnterpriseUser>(enterpriseService.listUsers(params)),
    placeholderData: keepPreviousData,
  });
};

const useInvalidateEnterprise = () => {
  const queryClient = useQueryClient();

  return {
    invalidateUsers: () =>
      queryClient.invalidateQueries({
        queryKey: [EnterpriseApiAction.Users],
      }),
    invalidateDepartments: () =>
      queryClient.invalidateQueries({
        queryKey: [EnterpriseApiAction.Departments],
      }),
    invalidateRoles: () =>
      queryClient.invalidateQueries({ queryKey: [EnterpriseApiAction.Roles] }),
  };
};

// Department mutations

export const useCreateEnterpriseDepartment = () => {
  const { invalidateDepartments, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (params: EnterpriseSaveDepartmentParams) =>
      unwrap(enterpriseService.createDepartment(params)),
    onSuccess: () => {
      invalidateDepartments();
      invalidateUsers();
    },
  });
};

export const useUpdateEnterpriseDepartment = () => {
  const { invalidateDepartments, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: ({
      departmentId,
      params,
    }: {
      departmentId: string;
      params: Partial<EnterpriseSaveDepartmentParams>;
    }) => unwrap(enterpriseService.updateDepartment(departmentId, params)),
    onSuccess: () => {
      invalidateDepartments();
      invalidateUsers();
    },
  });
};

export const useDeleteEnterpriseDepartment = () => {
  const { invalidateDepartments, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (departmentId: string) =>
      unwrap(enterpriseService.deleteDepartment(departmentId)),
    onSuccess: () => {
      invalidateDepartments();
      invalidateUsers();
    },
  });
};

// Role mutations

export const useCreateEnterpriseRole = () => {
  const { invalidateRoles, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (params: EnterpriseSaveRoleParams) =>
      unwrap(enterpriseService.createRole(params)),
    onSuccess: () => {
      invalidateRoles();
      invalidateUsers();
    },
  });
};

export const useUpdateEnterpriseRole = () => {
  const { invalidateRoles, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: ({
      roleId,
      params,
    }: {
      roleId: string;
      params: EnterpriseSaveRoleParams;
    }) => unwrap(enterpriseService.updateRole(roleId, params)),
    onSuccess: () => {
      invalidateRoles();
      invalidateUsers();
    },
  });
};

export const useDeleteEnterpriseRole = () => {
  const { invalidateRoles, invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (roleId: string) =>
      unwrap(enterpriseService.deleteRole(roleId)),
    onSuccess: () => {
      invalidateRoles();
      invalidateUsers();
    },
  });
};

// User mutations

export const useCreateEnterpriseUser = () => {
  const { invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (params: EnterpriseCreateUserParams) =>
      unwrap(enterpriseService.createUser(params)),
    onSuccess: () => {
      invalidateUsers();
    },
  });
};

export const useUpdateEnterpriseUser = () => {
  const { invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: ({
      username,
      params,
    }: {
      username: string;
      params: EnterpriseUpdateUserParams;
    }) => unwrap(enterpriseService.updateUser(username, params)),
    onSuccess: () => {
      invalidateUsers();
    },
  });
};

export const useUpdateEnterpriseUserPassword = () => {
  return useMutation({
    mutationFn: ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => unwrap(enterpriseService.updateUserPassword(username, password)),
  });
};

export const useUpdateEnterpriseUserActivateStatus = () => {
  const { invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: ({
      username,
      isActive,
    }: {
      username: string;
      isActive: boolean;
    }) =>
      unwrap(enterpriseService.updateUserActivateStatus(username, isActive)),
    onSuccess: () => {
      invalidateUsers();
    },
  });
};

export const useDeleteEnterpriseUser = () => {
  const { invalidateUsers } = useInvalidateEnterprise();

  return useMutation({
    mutationFn: (username: string) =>
      unwrap(enterpriseService.deleteUser(username)),
    onSuccess: () => {
      invalidateUsers();
    },
  });
};
