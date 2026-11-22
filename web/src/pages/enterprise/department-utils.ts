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

import type { EnterpriseDepartment } from '@/services/enterprise-service';

export const RootDepartmentId = '';

export function buildDepartmentChildrenMap(
  departments: EnterpriseDepartment[],
) {
  return departments.reduce<Record<string, EnterpriseDepartment[]>>(
    (acc, department) => {
      (acc[department.parent_id] ??= []).push(department);
      return acc;
    },
    {},
  );
}

// The department itself plus every descendant, used to forbid moving a
// department into its own subtree.
export function collectDepartmentSubtreeIds(
  departments: EnterpriseDepartment[],
  rootId: string,
) {
  const childrenByParent = buildDepartmentChildrenMap(departments);
  const ids = new Set<string>([rootId]);

  const walk = (parentId: string) => {
    (childrenByParent[parentId] ?? []).forEach((child) => {
      ids.add(child.id);
      walk(child.id);
    });
  };
  walk(rootId);

  return ids;
}

export function getDepartmentDepth(
  departments: EnterpriseDepartment[],
  departmentId: string,
) {
  const byId = new Map(
    departments.map((department) => [department.id, department]),
  );

  let depth = 0;
  let current = byId.get(departmentId);
  while (current && current.parent_id !== RootDepartmentId) {
    depth += 1;
    current = byId.get(current.parent_id);
  }
  return depth;
}
