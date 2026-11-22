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
	"ragflow/internal/common"
	"ragflow/internal/dao"
	"ragflow/internal/entity"

	"github.com/gin-gonic/gin"
)

// requireFeatureCode gates an endpoint on one function permission code. The
// superuser always passes; everyone else needs their role to grant the code.
// It responds with 403 and returns false when the caller is denied.
func requireFeatureCode(c *gin.Context, code string) bool {
	userID := c.GetString("user_id")
	if userID == "" {
		common.RespondError(c, common.CodeUnauthorized, "unauthenticated")
		return false
	}
	var user entity.User
	if err := dao.DB.WithContext(c.Request.Context()).
		Select("id", "is_superuser", "role_id").
		Where("id = ?", userID).
		Take(&user).Error; err != nil {
		common.RespondError(c, common.CodeForbidden, err.Error())
		return false
	}
	if user.IsSuperuser != nil && *user.IsSuperuser {
		return true
	}
	if user.RoleID == "" {
		common.RespondError(c, common.CodeForbidden, "没有执行该操作的权限")
		return false
	}
	var count int64
	if err := dao.DB.WithContext(c.Request.Context()).Model(&entity.RolePermission{}).
		Where("role_id = ? AND permission_code = ?", user.RoleID, code).
		Count(&count).Error; err != nil {
		common.RespondError(c, common.CodeServerError, err.Error())
		return false
	}
	if count == 0 {
		common.RespondError(c, common.CodeForbidden, "没有执行该操作的权限")
		return false
	}
	return true
}
