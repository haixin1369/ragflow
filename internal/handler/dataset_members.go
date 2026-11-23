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
	"fmt"
	"net/http"

	"ragflow/internal/common"
	"ragflow/internal/service"

	"github.com/gin-gonic/gin"
)

// KBMemberHandler serves the knowledge base member dialog endpoints.
type KBMemberHandler struct {
	memberService *service.KBMemberService
}

// NewKBMemberHandler creates the knowledge base member handler.
func NewKBMemberHandler() *KBMemberHandler {
	return &KBMemberHandler{memberService: service.NewKBMemberService()}
}

func kbMemberIdentity(c *gin.Context) (string, bool) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.RespondError(c, common.CodeUnauthorized, "unauthenticated")
		return "", false
	}
	return userID, true
}

func (h *KBMemberHandler) datasetID(c *gin.Context) (string, bool) {
	datasetID := c.Param("dataset_id")
	if datasetID == "" {
		common.RespondError(c, common.CodeBadRequest, "dataset_id is required")
		return "", false
	}
	return datasetID, true
}

// ListDatasetMembers returns the member rows of one knowledge base.
func (h *KBMemberHandler) ListDatasetMembers(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	members, err := h.memberService.List(c.Request.Context(), datasetID, userID)
	if err != nil {
		common.RespondError(c, http.StatusForbidden, err.Error())
		return
	}
	common.RespondSuccessList(c, members, "List dataset members", int64(len(members)))
}

// datasetMemberRequest carries one member grant.
type datasetMemberRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	Permission string `json:"permission" binding:"required"`
}

// SetDatasetMember grants or upgrades one member.
func (h *KBMemberHandler) SetDatasetMember(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	var req datasetMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "user_id and permission are required: "+err.Error())
		return
	}
	if err := h.memberService.Set(c.Request.Context(), datasetID, userID, req.UserID, req.Permission); err != nil {
		common.RespondError(c, http.StatusForbidden, err.Error())
		return
	}
	common.RespondSuccess(c, nil, fmt.Sprintf("Member %s updated", req.UserID))
}

// RemoveDatasetMember revokes one member.
func (h *KBMemberHandler) RemoveDatasetMember(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		common.RespondError(c, common.CodeBadRequest, "user_id is required")
		return
	}
	if err := h.memberService.Remove(c.Request.Context(), datasetID, userID, targetUserID); err != nil {
		common.RespondError(c, http.StatusForbidden, err.Error())
		return
	}
	common.RespondSuccess(c, nil, fmt.Sprintf("Member %s removed", targetUserID))
}

// ListMemberCandidates returns the departments and grantable users behind the
// organization-structure batch-add dialog.
func (h *KBMemberHandler) ListMemberCandidates(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	departments, users, err := h.memberService.Candidates(c.Request.Context(), datasetID, userID)
	if err != nil {
		common.RespondError(c, http.StatusForbidden, err.Error())
		return
	}
	common.RespondSuccess(c, gin.H{"departments": departments, "users": users}, "List member candidates")
}

// datasetMemberBatchRequest carries one bulk grant: many users, one level.
type datasetMemberBatchRequest struct {
	Members    []string `json:"members" binding:"required"`
	Permission string   `json:"permission" binding:"required"`
}

// SetDatasetMembers grants one permission level to many users at once.
func (h *KBMemberHandler) SetDatasetMembers(c *gin.Context) {
	userID, ok := kbMemberIdentity(c)
	if !ok {
		return
	}
	datasetID, ok := h.datasetID(c)
	if !ok {
		return
	}
	var req datasetMemberBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "members and permission are required: "+err.Error())
		return
	}
	added, failures, err := h.memberService.Batch(c.Request.Context(), datasetID, userID, req.Members, req.Permission)
	if err != nil {
		common.RespondError(c, http.StatusForbidden, err.Error())
		return
	}
	common.RespondSuccess(c, gin.H{"added": added, "failed": failures}, fmt.Sprintf("Added %d members", added))
}
