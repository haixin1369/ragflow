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

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/use-permission';

interface PermissionGateProps {
  code: string;
  children: ReactNode;
  // Rendered instead of children when the code is not granted; defaults to
  // rendering nothing.
  fallback?: ReactNode;
}

export function PermissionGate({
  code,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { has } = usePermission();

  if (!has(code)) {
    return fallback;
  }

  return <>{children}</>;
}
