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
// reject the grant; they already hold full access. targetUserID accepts a
// user id or an email, matching the member dialog input.
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
	return s.memberDAO.Upsert(ctx, dao.DB, datasetID, targetUserID, permission)
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
