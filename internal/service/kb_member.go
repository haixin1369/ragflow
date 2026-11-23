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

package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"ragflow/internal/dao"
	"ragflow/internal/entity"

	"gorm.io/gorm"
)

// KBMemberService serves the knowledge base member dialog: owners (and the
// superuser) grant view/edit access to other users; users holding any access
// can read the member list.
type KBMemberService struct {
	memberDAO    *dao.KBMemberDAO
	departmentDAO *dao.DepartmentDAO
}

// NewKBMemberService creates the knowledge base member service.
func NewKBMemberService() *KBMemberService {
	return &KBMemberService{
		memberDAO:     dao.NewKBMemberDAO(),
		departmentDAO: dao.NewDepartmentDAO(),
	}
}

func (s *KBMemberService) dataset(ctx context.Context, datasetID string) (*entity.Knowledgebase, error) {
	var kb entity.Knowledgebase
	if err := dao.DB.WithContext(ctx).
		Where("id = ? AND status = ?", datasetID, string(entity.StatusValid)).
		Take(&kb).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("知识库不存在或无权限访问")
		}
		return nil, err
	}
	return &kb, nil
}

// HasKBAccess reports whether the user owns the knowledge base, holds a
// member grant, or is the superuser.
func (s *KBMemberService) HasKBAccess(ctx context.Context, datasetID, userID string) (bool, error) {
	return s.memberDAO.HasKBAccess(ctx, dao.DB, datasetID, userID)
}

// IsOwner reports whether the user may manage the member list: only the owner
// and the superuser can.
func (s *KBMemberService) IsOwner(ctx context.Context, datasetID, userID string) (bool, error) {
	kb, err := s.dataset(ctx, datasetID)
	if err != nil {
		return false, err
	}
	var count int64
	if err := dao.DB.WithContext(ctx).Model(&entity.User{}).
		Where("id = ? AND is_superuser = ?", userID, true).
		Count(&count).Error; err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}
	return strings.TrimSpace(kb.UserID) == userID || (strings.TrimSpace(kb.UserID) == "" && strings.TrimSpace(kb.CreatedBy) == userID), nil
}

// List returns the member rows joined with user facts.
func (s *KBMemberService) List(ctx context.Context, datasetID, userID string) ([]map[string]interface{}, error) {
	if allowed, err := s.HasKBAccess(ctx, datasetID, userID); err != nil {
		return nil, err
	} else if !allowed {
		return nil, fmt.Errorf("知识库不存在或无权限访问")
	}
	members, err := s.memberDAO.ListByKB(ctx, dao.DB, datasetID)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(members))
	for _, member := range members {
		var user entity.User
		if err := dao.DB.WithContext(ctx).Select("id", "email", "nickname").
			Where("id = ?", member.UserID).Take(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue // stale grant on a deleted account
			}
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"user_id":     user.ID,
			"email":       user.Email,
			"nickname":    user.Nickname,
			"permission":  member.Permission,
			"create_time": member.CreateTime,
		})
	}
	return result, nil
}

// Set grants one user a level on the knowledge base. Owners and superusers
// reject the grant; they already hold full access.
func (s *KBMemberService) Set(ctx context.Context, datasetID, callerID, targetUserID, permission string) error {
	if owner, err := s.IsOwner(ctx, datasetID, callerID); err != nil {
		return err
	} else if !owner {
		return fmt.Errorf("仅知识库所有者可以管理成员")
	}
	kb, err := s.dataset(ctx, datasetID)
	if err != nil {
		return err
	}
	return s.grantMember(ctx, kb, targetUserID, permission)
}

// grantMember resolves one target and upserts the grant. targetUserID accepts
// a user id or an email, matching the member dialog input.
func (s *KBMemberService) grantMember(ctx context.Context, kb *entity.Knowledgebase, targetUserID, permission string) error {
	var user entity.User
	if err := dao.DB.WithContext(ctx).Where("id = ?", targetUserID).Take(&user).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// The dialog accepts an email as well as an id; resolve it so the
		// member grant lands on the right user.
		if err := dao.DB.WithContext(ctx).Where("email = ?", targetUserID).Take(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("用户不存在")
			}
			return err
		}
		targetUserID = user.ID
	}
	if strings.TrimSpace(kb.UserID) == targetUserID || (strings.TrimSpace(kb.UserID) == "" && strings.TrimSpace(kb.CreatedBy) == targetUserID) {
		return fmt.Errorf("该用户已是知识库所有者")
	}
	if user.IsSuperuser != nil && *user.IsSuperuser {
		return fmt.Errorf("超级管理员无需授权")
	}
	return s.memberDAO.Upsert(ctx, dao.DB, kb.ID, targetUserID, permission)
}

// KBMemberGrantFailure reports why one batch target was skipped.
type KBMemberGrantFailure struct {
	UserID string `json:"user_id"`
	Reason string `json:"reason"`
}

// Batch grants one permission level to many users at once. Targets are granted
// independently: one invalid target does not roll back the others, and every
// failure is reported per user so the dialog can show exactly what happened.
func (s *KBMemberService) Batch(ctx context.Context, datasetID, callerID string, targetUserIDs []string, permission string) (int, []KBMemberGrantFailure, error) {
	if permission != entity.KBMemberPermissionView && permission != entity.KBMemberPermissionEdit {
		return 0, nil, fmt.Errorf("权限仅支持 view 或 edit")
	}
	if len(targetUserIDs) == 0 {
		return 0, nil, fmt.Errorf("请至少选择一个成员")
	}
	if owner, err := s.IsOwner(ctx, datasetID, callerID); err != nil {
		return 0, nil, err
	} else if !owner {
		return 0, nil, fmt.Errorf("仅知识库所有者可以管理成员")
	}
	kb, err := s.dataset(ctx, datasetID)
	if err != nil {
		return 0, nil, err
	}
	added := 0
	failures := make([]KBMemberGrantFailure, 0)
	for _, target := range targetUserIDs {
		if err := s.grantMember(ctx, kb, target, permission); err != nil {
			failures = append(failures, KBMemberGrantFailure{UserID: target, Reason: err.Error()})
			continue
		}
		added++
	}
	return added, failures, nil
}

// Candidates returns the organization data behind the batch-add dialog: every
// department plus every grantable user (owner and superusers excluded) with
// their department assignment.
func (s *KBMemberService) Candidates(ctx context.Context, datasetID, callerID string) ([]entity.Department, []map[string]interface{}, error) {
	if owner, err := s.IsOwner(ctx, datasetID, callerID); err != nil {
		return nil, nil, err
	} else if !owner {
		return nil, nil, fmt.Errorf("仅知识库所有者可以管理成员")
	}
	kb, err := s.dataset(ctx, datasetID)
	if err != nil {
		return nil, nil, err
	}
	ownerID := strings.TrimSpace(kb.UserID)
	if ownerID == "" {
		ownerID = strings.TrimSpace(kb.CreatedBy)
	}
	departments, err := s.departmentDAO.List(ctx, dao.DB)
	if err != nil {
		return nil, nil, err
	}
	var users []entity.User
	if err := dao.DB.WithContext(ctx).Select("id", "email", "nickname", "department_id").
		// is_superuser is NULL for ordinary accounts, so a bare `= false`
		// would filter them out too; exclude only rows explicitly set to true.
		Where("(is_superuser IS NULL OR is_superuser = ?) AND id <> ?", false, ownerID).
		Order("email").Find(&users).Error; err != nil {
		return nil, nil, err
	}
	rows := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		rows = append(rows, map[string]interface{}{
			"user_id":       user.ID,
			"email":         user.Email,
			"nickname":      user.Nickname,
			"department_id": user.DepartmentID,
		})
	}
	return departments, rows, nil
}

// Remove revokes one user's grant.
func (s *KBMemberService) Remove(ctx context.Context, datasetID, callerID, targetUserID string) error {
	if owner, err := s.IsOwner(ctx, datasetID, callerID); err != nil {
		return err
	} else if !owner {
		return fmt.Errorf("仅知识库所有者可以管理成员")
	}
	return s.memberDAO.Remove(ctx, dao.DB, datasetID, targetUserID)
}
