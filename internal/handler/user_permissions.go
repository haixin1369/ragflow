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
	"strings"

	"ragflow/internal/common"
	"ragflow/internal/dao"
	"ragflow/internal/entity"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MePermissions returns the function permission codes the current user holds.
// The superuser holds every seeded code; everyone else resolves their role's
// grants. The frontend hides buttons with these codes via PermissionGate.
func (h *UserHandler) MePermissions(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		common.RespondError(c, common.CodeUnauthorized, "unauthenticated")
		return
	}
	ctx := c.Request.Context()

	var user entity.User
	if err := dao.DB.WithContext(ctx).
		Select("id", "is_superuser", "role_id").
		Where("id = ?", userID).
		Take(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.RespondError(c, common.CodeUnauthorized, "user not found")
			return
		}
		common.RespondError(c, common.CodeServerError, err.Error())
		return
	}

	var codes []string
	if user.IsSuperuser != nil && *user.IsSuperuser {
		for _, permission := range entity.BuiltinFunctionPermissions() {
			codes = append(codes, permission.Code)
		}
	} else if strings.TrimSpace(user.RoleID) != "" {
		if err := dao.DB.WithContext(ctx).Model(&entity.RolePermission{}).
			Where("role_id = ?", strings.TrimSpace(user.RoleID)).
			Order("permission_code").
			Pluck("permission_code", &codes).Error; err != nil {
			common.RespondError(c, common.CodeServerError, err.Error())
			return
		}
	}
	if codes == nil {
		codes = []string{}
	}
	common.RespondSuccess(c, map[string]interface{}{"permissions": codes}, "Load user permissions")
}
