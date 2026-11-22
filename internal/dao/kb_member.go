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
	"errors"
	"strings"

	"ragflow/internal/common"
	"ragflow/internal/entity"

	"gorm.io/gorm"
)

// KBMemberDAO owns the knowledge base member grants.
type KBMemberDAO struct{}

// NewKBMemberDAO creates the knowledge base member DAO.
func NewKBMemberDAO() *KBMemberDAO { return &KBMemberDAO{} }

// KBMemberError is a domain error carrying a user-facing message.
type KBMemberError struct {
	Message string
}

func (e *KBMemberError) Error() string { return e.Message }

func kbMemberExec(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return DB
}

// ValidatePermission reports whether the requested member level is valid.
func ValidateKBMemberPermission(permission string) bool {
	return permission == entity.KBMemberPermissionView || permission == entity.KBMemberPermissionEdit
}

// Upsert grants one user a level on one knowledge base, replacing any
// existing level. Owners and superusers never get rows: granting them is a
// no-op at the call site, and the unique constraint backstops concurrency.
func (d *KBMemberDAO) Upsert(ctx context.Context, tx *gorm.DB, kbID, userID, permission string) error {
	if !ValidateKBMemberPermission(permission) {
		return &KBMemberError{Message: "无效的成员权限，仅支持 view 或 edit"}
	}
	exec := kbMemberExec(tx)
	return exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		var existing entity.KBMember
		err := t.Where("kb_id = ? AND user_id = ?", kbID, userID).Take(&existing).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			return t.Create(&entity.KBMember{
				ID:         common.GenerateUUID(),
				KbID:       kbID,
				UserID:     userID,
				Permission: permission,
			}).Error
		case err != nil:
			return err
		default:
			return t.Model(&entity.KBMember{}).Where("id = ?", existing.ID).
				Update("permission", permission).Error
		}
	})
}

// Remove revokes one user's grant on one knowledge base.
func (d *KBMemberDAO) Remove(ctx context.Context, tx *gorm.DB, kbID, userID string) error {
	result := kbMemberExec(tx).WithContext(ctx).
		Where("kb_id = ? AND user_id = ?", kbID, userID).
		Delete(&entity.KBMember{})
	return result.Error
}

// RemoveByUser revokes every grant of one user (account deletion hygiene).
func (d *KBMemberDAO) RemoveByUser(ctx context.Context, tx *gorm.DB, userID string) error {
	return kbMemberExec(tx).WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&entity.KBMember{}).Error
}

// ListByKB returns the member rows of one knowledge base.
func (d *KBMemberDAO) ListByKB(ctx context.Context, tx *gorm.DB, kbID string) ([]entity.KBMember, error) {
	var members []entity.KBMember
	if err := kbMemberExec(tx).WithContext(ctx).
		Where("kb_id = ?", kbID).
		Order("create_time").
		Find(&members).Error; err != nil {
		return nil, err
	}
	return members, nil
}

// HasKBAccess reports whether the user owns the knowledge base, is the
// superuser, or holds any member grant on it. The shared check behind the
// write guards.
func (d *KBMemberDAO) HasKBAccess(ctx context.Context, tx *gorm.DB, kbID, userID string) (bool, error) {
	if strings.TrimSpace(userID) == "" {
		return false, nil
	}
	exec := kbMemberExec(tx)
	var count int64
	if err := exec.WithContext(ctx).Model(&entity.User{}).
		Where("id = ? AND is_superuser = ?", userID, true).
		Count(&count).Error; err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}
	if err := exec.WithContext(ctx).Model(&entity.Knowledgebase{}).
		Where("id = ? AND status = ?", kbID, string(entity.StatusValid)).
		Where("COALESCE(NULLIF(TRIM(user_id), ''), created_by) = ?", userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}
	if err := exec.WithContext(ctx).Model(&entity.KBMember{}).
		Where("kb_id = ? AND user_id = ?", kbID, userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
