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

package admin

import (
	"errors"

	"ragflow/internal/common"
	"ragflow/internal/dao"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// departmentRequest carries create/move payloads for departments.
type departmentRequest struct {
	Name     string `json:"name"`
	ParentID string `json:"parent_id"`
}

func (h *Handler) ListDepartments(c *gin.Context) {
	departments, err := h.service.ListDepartments(c.Request.Context())
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, departments, "List departments", int64(len(departments)))
}

func (h *Handler) CreateDepartment(c *gin.Context) {
	var req departmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "name is required: "+err.Error())
		return
	}
	department, err := h.service.CreateDepartment(c.Request.Context(), req.Name, req.ParentID)
	if err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, department, "Department created")
}

func (h *Handler) UpdateDepartment(c *gin.Context) {
	id := c.Param("department_id")
	if id == "" {
		common.RespondError(c, common.CodeBadRequest, "department_id is required")
		return
	}
	// Bind once into a generic map so an explicit parent_id key — including a
	// move back to the root as "" — is distinguishable from a rename.
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		common.RespondError(c, common.CodeBadRequest, "invalid request body: "+err.Error())
		return
	}
	if name, ok := body["name"].(string); ok && name != "" {
		if err := h.service.RenameDepartment(c.Request.Context(), id, name); err != nil {
			respondEnterpriseError(c, err)
			return
		}
	}
	if parentID, ok := body["parent_id"]; ok {
		newParentID, _ := parentID.(string)
		if err := h.service.MoveDepartment(c.Request.Context(), id, newParentID); err != nil {
			respondEnterpriseError(c, err)
			return
		}
	}
	common.RespondSuccess(c, nil, "Department updated")
}

func (h *Handler) DeleteDepartment(c *gin.Context) {
	id := c.Param("department_id")
	if id == "" {
		common.RespondError(c, common.CodeBadRequest, "department_id is required")
		return
	}
	if err := h.service.DeleteDepartment(c.Request.Context(), id); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Department deleted")
}

// roleRequest carries role create/update payloads.
type roleRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

func (h *Handler) ListRoles(c *gin.Context) {
	roles, err := h.service.ListRoles(c.Request.Context())
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, roles, "List roles", int64(len(roles)))
}

func (h *Handler) CreateRole(c *gin.Context) {
	var req roleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "name is required: "+err.Error())
		return
	}
	role, err := h.service.CreateRole(c.Request.Context(), req.Name, req.Description, req.Permissions)
	if err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, role, "Role created")
}

func (h *Handler) UpdateRole(c *gin.Context) {
	id := c.Param("role_id")
	if id == "" {
		common.RespondError(c, common.CodeBadRequest, "role_id is required")
		return
	}
	var req roleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "invalid request body: "+err.Error())
		return
	}
	if err := h.service.UpdateRole(c.Request.Context(), id, req.Name, req.Description, req.Permissions); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Role updated")
}

func (h *Handler) DeleteRole(c *gin.Context) {
	id := c.Param("role_id")
	if id == "" {
		common.RespondError(c, common.CodeBadRequest, "role_id is required")
		return
	}
	if err := h.service.DeleteRole(c.Request.Context(), id); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Role deleted")
}

func (h *Handler) ListFunctionPermissions(c *gin.Context) {
	permissions, err := h.service.ListFunctionPermissions(c.Request.Context())
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, permissions, "List function permissions", int64(len(permissions)))
}

// userAssignmentRequest carries department/role assignment payloads.
type userAssignmentRequest struct {
	DepartmentID string `json:"department_id"`
	RoleID       string `json:"role_id"`
}

func (h *Handler) AssignUserDepartment(c *gin.Context) {
	username, err := getUserName(c)
	if err != nil {
		return
	}
	var req userAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "invalid request body: "+err.Error())
		return
	}
	if err := h.service.AssignUserDepartment(c.Request.Context(), username, req.DepartmentID); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "User department updated")
}

func (h *Handler) AssignUserRole(c *gin.Context) {
	username, err := getUserName(c)
	if err != nil {
		return
	}
	var req userAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "invalid request body: "+err.Error())
		return
	}
	if err := h.service.AssignUserRole(c.Request.Context(), username, req.RoleID); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "User role updated")
}

func (h *Handler) ListAdminKnowledgebases(c *gin.Context) {
	result, err := h.service.ListAdminKnowledgebases(c.Request.Context(), c.Query("keyword"), c.Query("department_id"))
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, result, "List knowledge bases", int64(len(result)))
}

func (h *Handler) ListKBMembers(c *gin.Context) {
	kbID := c.Param("kb_id")
	if kbID == "" {
		common.RespondError(c, common.CodeBadRequest, "kb_id is required")
		return
	}
	members, err := h.service.ListKBMembers(c.Request.Context(), kbID)
	if err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}
	common.RespondSuccessList(c, members, "List knowledge base members", int64(len(members)))
}

// kbMemberRequest carries the member grant payload.
type kbMemberRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	Permission string `json:"permission" binding:"required"`
}

func (h *Handler) SetKBMember(c *gin.Context) {
	kbID := c.Param("kb_id")
	if kbID == "" {
		common.RespondError(c, common.CodeBadRequest, "kb_id is required")
		return
	}
	var req kbMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "user_id and permission are required: "+err.Error())
		return
	}
	if err := h.service.SetKBMember(c.Request.Context(), kbID, req.UserID, req.Permission); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Member updated")
}

func (h *Handler) RemoveKBMember(c *gin.Context) {
	kbID := c.Param("kb_id")
	userID := c.Param("user_id")
	if kbID == "" || userID == "" {
		common.RespondError(c, common.CodeBadRequest, "kb_id and user_id are required")
		return
	}
	if err := h.service.RemoveKBMember(c.Request.Context(), kbID, userID); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Member removed")
}

// kbTransferRequest carries the ownership transfer payload.
type kbTransferRequest struct {
	TargetUserID string `json:"target_user_id" binding:"required"`
}

func (h *Handler) TransferKBOwnership(c *gin.Context) {
	kbID := c.Param("kb_id")
	if kbID == "" {
		common.RespondError(c, common.CodeBadRequest, "kb_id is required")
		return
	}
	var req kbTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.RespondError(c, common.CodeBadRequest, "target_user_id is required: "+err.Error())
		return
	}
	if err := h.service.TransferKBOwnership(c.Request.Context(), kbID, req.TargetUserID); err != nil {
		respondEnterpriseError(c, err)
		return
	}
	common.RespondSuccess(c, nil, "Ownership transferred")
}

// respondEnterpriseError maps domain errors onto their HTTP codes.
func respondEnterpriseError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, common.ErrUserNotFound):
		common.RespondError(c, common.CodeNotFound, "User not found")
	case errors.Is(err, gorm.ErrRecordNotFound):
		common.RespondError(c, common.CodeNotFound, err.Error())
	default:
		var departmentErr *dao.DepartmentError
		var roleErr *dao.RoleError
		var memberErr *dao.KBMemberError
		switch {
		case errors.As(err, &departmentErr), errors.As(err, &roleErr), errors.As(err, &memberErr):
			common.RespondError(c, common.CodeBadRequest, err.Error())
		default:
			common.RespondError(c, common.CodeServerError, err.Error())
		}
	}
}
