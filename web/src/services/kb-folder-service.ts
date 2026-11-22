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

const ApiPrefix = '/api/v1';

export interface DatasetFolder {
  id: string;
  kb_id: string;
  // "" for a root folder.
  parent_id: string;
  name: string;
  path: string;
  create_time: number;
}

export interface DatasetFolderListResponse {
  code: number;
  message: string;
  data: DatasetFolder[];
  total?: number;
}

export interface DatasetFolderResponse<T = null> {
  code: number;
  message: string;
  data: T;
}

export interface CreateDatasetFolderParams {
  // "" creates a root folder.
  parent_id: string;
  name: string;
}

export const kbFolderService = {
  // One level of the tree per call; parentId "" lists the root level.
  listFolders: (datasetId: string, parentId: string) =>
    request.get<DatasetFolderListResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/folders`,
      { params: { parent_id: parentId } },
    ),
  createFolder: (datasetId: string, params: CreateDatasetFolderParams) =>
    request.post<DatasetFolderResponse<DatasetFolder>>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/folders`,
      params,
    ),
  renameFolder: (datasetId: string, folderId: string, name: string) =>
    request.put<DatasetFolderResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/folders/${encodeURIComponent(folderId)}`,
      { name },
    ),
  deleteFolder: (datasetId: string, folderId: string) =>
    request.delete<DatasetFolderResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/folders/${encodeURIComponent(folderId)}`,
    ),
  // folderId "" moves the document back to the unfiled root.
  moveDocument: (datasetId: string, documentId: string, folderId: string) =>
    request.put<DatasetFolderResponse>(
      `${ApiPrefix}/datasets/${encodeURIComponent(datasetId)}/documents/${encodeURIComponent(documentId)}/folder`,
      { folder_id: folderId },
    ),
};
