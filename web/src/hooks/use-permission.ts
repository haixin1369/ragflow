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

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { userPermissionService } from '@/services/user-permission-service';

export const enum PermissionApiAction {
  MePermissions = 'userPermissions',
}

export const PermissionKeys = {
  all: () => [PermissionApiAction.MePermissions] as const,
};

// Button-level function permissions. A failed or rejected request degrades to
// "no permissions" — the gated buttons stay hidden but the pages remain.
export const usePermission = () => {
  const { data } = useQuery({
    queryKey: PermissionKeys.all(),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data: res } = await userPermissionService.mePermissions();
        if (res.code !== 0) {
          return [];
        }
        return res.data.permissions ?? [];
      } catch {
        return [];
      }
    },
  });

  const has = useCallback(
    (code: string) => (data ?? []).includes(code),
    [data],
  );

  return { has };
};
