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

package dao

import (
	"context"
	"fmt"
	"strings"

	"ragflow/internal/common"
	"ragflow/internal/entity"

	"gorm.io/gorm"
)

// RoleError is a domain error carrying a user-facing message.
type RoleError struct {
	Message string
}

func (e *RoleError) Error() string { return e.Message }

// RoleDAO owns roles, their permission grants, and the function permission
// catalogue.
type RoleDAO struct{}

// NewRoleDAO creates the role DAO.
func NewRoleDAO() *RoleDAO { return &RoleDAO{} }

func roleExec(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return DB
}

// Create inserts a role and its permission grants in one transaction.
func (d *RoleDAO) Create(ctx context.Context, tx *gorm.DB, name, description string, permissionCodes []string) (*entity.Role, error) {
	if strings.TrimSpace(name) == "" {
		return nil, &RoleError{Message: "角色名称不能为空"}
	}
	if err := d.validatePermissionCodes(ctx, tx, permissionCodes); err != nil {
		return nil, err
	}
	exec := roleExec(tx)
	role := &entity.Role{
		ID:          common.GenerateUUID(),
		Name:        strings.TrimSpace(name),
		Description: strings.TrimSpace(description),
	}
	err := exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		if err := t.Create(role).Error; err != nil {
			return err
		}
		return grantRolePermissions(t, role.ID, permissionCodes)
	})
	if err != nil {
		return nil, err
	}
	return role, nil
}

func grantRolePermissions(t *gorm.DB, roleID string, permissionCodes []string) error {
	if len(permissionCodes) == 0 {
		return nil
	}
	grants := make([]entity.RolePermission, 0, len(permissionCodes))
	for _, code := range permissionCodes {
		grants = append(grants, entity.RolePermission{RoleID: roleID, PermissionCode: code})
	}
	return t.Create(&grants).Error
}

// validatePermissionCodes rejects unknown codes so a stale client cannot
// grant permissions the system has never registered.
func (d *RoleDAO) validatePermissionCodes(ctx context.Context, tx *gorm.DB, permissionCodes []string) error {
	if len(permissionCodes) == 0 {
		return nil
	}
	known, err := d.ListFunctionPermissions(ctx, tx)
	if err != nil {
		return err
	}
	knownCodes := make(map[string]struct{}, len(known))
	for _, permission := range known {
		knownCodes[permission.Code] = struct{}{}
	}
	for _, code := range permissionCodes {
		if _, ok := knownCodes[code]; !ok {
			return &RoleError{Message: fmt.Sprintf("未知的功能权限: %s", code)}
		}
	}
	return nil
}

// List returns every role.
func (d *RoleDAO) List(ctx context.Context, tx *gorm.DB) ([]entity.Role, error) {
	var roles []entity.Role
	if err := roleExec(tx).WithContext(ctx).Order("create_time").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// Get reads one role by id.
func (d *RoleDAO) Get(ctx context.Context, tx *gorm.DB, id string) (*entity.Role, error) {
	var role entity.Role
	if err := roleExec(tx).WithContext(ctx).Where("id = ?", id).Take(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// PermissionCodes returns the codes one role grants.
func (d *RoleDAO) PermissionCodes(ctx context.Context, tx *gorm.DB, roleID string) ([]string, error) {
	var codes []string
	if err := roleExec(tx).WithContext(ctx).Model(&entity.RolePermission{}).
		Where("role_id = ?", roleID).
		Order("permission_code").
		Pluck("permission_code", &codes).Error; err != nil {
		return nil, err
	}
	return codes, nil
}

// Update rewrites a role's name, description, and permission grants. Existing
// grants are replaced wholesale so the request payload is the single source
// of truth.
func (d *RoleDAO) Update(ctx context.Context, tx *gorm.DB, id, name, description string, permissionCodes []string) error {
	if strings.TrimSpace(name) == "" {
		return &RoleError{Message: "角色名称不能为空"}
	}
	if err := d.validatePermissionCodes(ctx, tx, permissionCodes); err != nil {
		return err
	}
	exec := roleExec(tx)
	return exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		result := t.Model(&entity.Role{}).Where("id = ?", id).Updates(map[string]any{
			"name":        strings.TrimSpace(name),
			"description": strings.TrimSpace(description),
		})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return &RoleError{Message: "角色不存在"}
		}
		if err := t.Where("role_id = ?", id).Delete(&entity.RolePermission{}).Error; err != nil {
			return err
		}
		return grantRolePermissions(t, id, permissionCodes)
	})
}

// Delete removes a role. It fails closed while any user still holds the role.
func (d *RoleDAO) Delete(ctx context.Context, tx *gorm.DB, id string) error {
	exec := roleExec(tx)
	return exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		var userCount int64
		if err := t.Model(&entity.User{}).Where("role_id = ?", id).Count(&userCount).Error; err != nil {
			return err
		}
		if userCount > 0 {
			return &RoleError{Message: fmt.Sprintf("仍有 %d 个用户使用该角色，请先解除分配", userCount)}
		}
		if err := t.Where("role_id = ?", id).Delete(&entity.RolePermission{}).Error; err != nil {
			return err
		}
		result := t.Where("id = ?", id).Delete(&entity.Role{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return &RoleError{Message: "角色不存在"}
		}
		return nil
	})
}

// ListFunctionPermissions returns the seeded function permission catalogue.
func (d *RoleDAO) ListFunctionPermissions(ctx context.Context, tx *gorm.DB) ([]entity.FunctionPermission, error) {
	var permissions []entity.FunctionPermission
	if err := roleExec(tx).WithContext(ctx).Order("code").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}
