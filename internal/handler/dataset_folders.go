//
//  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

package handler

import (
	"errors"

	"ragflow/internal/common"
	"ragflow/internal/service"

	"github.com/gin-gonic/gin"
)

// KBFolderHandler serves the knowledge base directory tree endpoints.
type KBFolderHandler struct {
	folderService *service.KBFolderService
}

// NewKBFolderHandler creates the knowledge base folder handler.
func NewKBFolderHandler() *KBFolderHandler {
	return &KBFolderHandler{folderService: service.NewKBFolderService()}
}

func (h *KBFolderHandler) datasetID(c *gin.Context) (string, bool) {
	datasetID := c.Param("dataset_id")
	if datasetID == "" {
		common.RespondError(c, common.CodeBadRequest, "dataset_id is required")
		return "", false
	}
	return datasetID, true
}

func respondKBFolderError(c *gin.Context, err error) {
	var folderErr *service.KBFolderError
	switch {
	case errors.As(err, &folderErr):
		common.RespondError(c, common.CodeBadRequest, err.Error())
	default:
		common.RespondError(c, common.CodeForbidden, err.Error())
	}
}

// ListDatasetFolders returns one level of the directory tree.
func (h *KBFolderHandler) ListDatasetFolders(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	if err := h.folderService.RequireKBView(c.Request.Context(), datasetID, userID); err != nil {
		respondKBFolderError(c, err)
		return
	}
	folders, err := h.folderService.List(c.Request.Context(), datasetID, c.Query("parent_id"))
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, folders, "List dataset folders", int64(len(folders)))
}

// folderRequest carries folder create/rename payloads.
type folderRequest struct {
	ParentID string `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
}

// CreateDatasetFolder adds a folder.
func (h *KBFolderHandler) CreateDatasetFolder(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	var req folderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "name is required: "+err.Error())
		return
	}
	folder, err := h.folderService.Create(c.Request.Context(), datasetID, userID, req.ParentID, req.Name)
	if err != nil {
		respondKBFolderError(c, err)
		return
	}
	common.RespondSuccess(c, folder, "Folder created")
}

// UpdateDatasetFolder renames a folder.
func (h *KBFolderHandler) UpdateDatasetFolder(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	folderID := c.Param("folder_id")
	if folderID == "" {
		common.RespondError(c, common.CodeBadRequest, "folder_id is required")
		return
	}
	var req folderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "name is required: "+err.Error())
		return
	}
	if err := h.folderService.Rename(c.Request.Context(), datasetID, userID, folderID, req.Name); err != nil {
		respondKBFolderError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Folder updated")
}

// DeleteDatasetFolder removes an empty folder.
func (h *KBFolderHandler) DeleteDatasetFolder(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	folderID := c.Param("folder_id")
	if folderID == "" {
		common.RespondError(c, common.CodeBadRequest, "folder_id is required")
		return
	}
	if err := h.folderService.Delete(c.Request.Context(), datasetID, userID, folderID); err != nil {
		respondKBFolderError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Folder deleted")
}

// documentFolderRequest carries the document filing payload.
type documentFolderRequest struct {
	FolderID string `json:"folder_id"`
}

// MoveDocumentToFolder files one document.
func (h *KBFolderHandler) MoveDocumentToFolder(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	documentID := c.Param("document_id")
	if documentID == "" {
		common.RespondError(c, common.CodeBadRequest, "document_id is required")
		return
	}
	var req documentFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "invalid request body: "+err.Error())
		return
	}
	if err := h.folderService.MoveDocument(c.Request.Context(), datasetID, userID, documentID, req.FolderID); err != nil {
		respondKBFolderError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Document moved")
}
