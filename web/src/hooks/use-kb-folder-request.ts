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
import { DocumentKeys } from '@/hooks/document-query-keys';
import {
  kbFolderService,
  type DatasetFolderResponse,
} from '@/services/kb-folder-service';

export const enum KbFolderApiAction {
  DatasetFolders = 'datasetFolders',
}

export const KbFolderKeys = {
  // All folder queries of one dataset; the invalidation prefix.
  dataset: (datasetId: string) =>
    [KbFolderApiAction.DatasetFolders, datasetId] as const,
  list: (datasetId: string, parentId: string) =>
    [KbFolderApiAction.DatasetFolders, datasetId, parentId] as const,
};

async function unwrap<T>(
  promise: Promise<AxiosResponse<DatasetFolderResponse<T>>>,
): Promise<DatasetFolderResponse<T>> {
  const { data } = await promise;
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  return data;
}

// One tree level per query. The tree mounts a query per expanded node, so a
// failed level only empties that branch (the interceptor toasts the message).
export const useFetchDatasetFolders = (
  datasetId?: string,
  parentId = '',
  options?: { enabled?: boolean },
) => {
  const enabled = (options?.enabled ?? true) && !!datasetId;

  return useQuery({
    queryKey: KbFolderKeys.list(datasetId ?? '', parentId),
    enabled,
    queryFn: async () => {
      const { data } = await kbFolderService.listFolders(datasetId!, parentId);
      if (data.code !== 0) {
        throw new Error(data.message);
      }
      return data.data ?? [];
    },
  });
};

const useInvalidateDatasetFolders = () => {
  const queryClient = useQueryClient();

  return {
    invalidateFolders: (datasetId: string) =>
      queryClient.invalidateQueries({
        queryKey: KbFolderKeys.dataset(datasetId),
      }),
  };
};

export const useCreateDatasetFolder = () => {
  const { invalidateFolders } = useInvalidateDatasetFolders();

  return useMutation({
    mutationFn: ({
      datasetId,
      parentId,
      name,
    }: {
      datasetId: string;
      parentId: string;
      name: string;
    }) =>
      unwrap(
        kbFolderService.createFolder(datasetId, { parent_id: parentId, name }),
      ),
    onSuccess: () => {
      message.success(i18n.t('message.created'));
    },
    onSettled: (_data, _error, { datasetId }) => {
      invalidateFolders(datasetId);
    },
  });
};

export const useRenameDatasetFolder = () => {
  const { invalidateFolders } = useInvalidateDatasetFolders();

  return useMutation({
    mutationFn: ({
      datasetId,
      folderId,
      name,
    }: {
      datasetId: string;
      folderId: string;
      name: string;
    }) => unwrap(kbFolderService.renameFolder(datasetId, folderId, name)),
    onSuccess: () => {
      message.success(i18n.t('message.renamed'));
    },
    onSettled: (_data, _error, { datasetId }) => {
      invalidateFolders(datasetId);
    },
  });
};

export const useDeleteDatasetFolder = () => {
  const { invalidateFolders } = useInvalidateDatasetFolders();

  return useMutation({
    mutationFn: ({
      datasetId,
      folderId,
    }: {
      datasetId: string;
      folderId: string;
    }) => unwrap(kbFolderService.deleteFolder(datasetId, folderId)),
    onSuccess: () => {
      message.success(i18n.t('message.deleted'));
    },
    onSettled: (_data, _error, { datasetId }) => {
      invalidateFolders(datasetId);
    },
  });
};

export const useMoveDocumentToFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      datasetId,
      documentId,
      folderId,
    }: {
      datasetId: string;
      documentId: string;
      // "" moves the document back to the unfiled root.
      folderId: string;
    }) => unwrap(kbFolderService.moveDocument(datasetId, documentId, folderId)),
    onSuccess: () => {
      message.success(i18n.t('message.operated'));
    },
    onSettled: () => {
      // Every folder-scoped list view may change.
      queryClient.invalidateQueries({ queryKey: DocumentKeys.all() });
    },
  });
};
