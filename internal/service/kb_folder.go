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

	"ragflow/internal/common"
	"ragflow/internal/dao"
	"ragflow/internal/entity"
	"ragflow/internal/permission"

	"gorm.io/gorm"
)

// KBFolderError is a domain error carrying a user-facing message.
type KBFolderError struct {
	Message string
}

func (e *KBFolderError) Error() string { return e.Message }

// KBFolderService owns the knowledge base directory tree: lazy per-level
// reads, create/rename/move/delete, and the document filing operations.
type KBFolderService struct {
	memberDAO *dao.KBMemberDAO
}

// NewKBFolderService creates the knowledge base folder service.
func NewKBFolderService() *KBFolderService {
	return &KBFolderService{memberDAO: dao.NewKBMemberDAO()}
}

// RequireKBEdit verifies the caller may manage the directory tree: the owner,
// an edit-level member, or the superuser.
func (s *KBFolderService) RequireKBEdit(ctx context.Context, datasetID, userID string) error {
	allowed, err := s.memberDAO.HasKBAccess(ctx, dao.DB, datasetID, userID)
	if err != nil {
		return err
	}
	if !allowed {
		return fmt.Errorf("知识库不存在或无权限访问")
	}
	if ok, err := s.isOwnerOrSuperuser(ctx, datasetID, userID); err != nil {
		return err
	} else if ok {
		return nil
	}
	return s.requireEditMember(ctx, datasetID, userID)
}

func (s *KBFolderService) isOwnerOrSuperuser(ctx context.Context, datasetID, userID string) (bool, error) {
	var superCount int64
	if err := dao.DB.WithContext(ctx).Model(&entity.User{}).
		Where("id = ? AND is_superuser = ?", userID, true).
		Count(&superCount).Error; err != nil {
		return false, err
	}
	if superCount > 0 {
		return true, nil
	}
	var kb entity.Knowledgebase
	if err := dao.DB.WithContext(ctx).
		Where("id = ? AND status = ?", datasetID, string(entity.StatusValid)).
		Take(&kb).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, fmt.Errorf("知识库不存在或无权限访问")
		}
		return false, err
	}
	ownerID := strings.TrimSpace(kb.UserID)
	if ownerID == "" {
		ownerID = strings.TrimSpace(kb.CreatedBy)
	}
	return ownerID == userID, nil
}

func (s *KBFolderService) requireEditMember(ctx context.Context, datasetID, userID string) error {
	var member entity.KBMember
	err := dao.DB.WithContext(ctx).
		Where("kb_id = ? AND user_id = ?", datasetID, userID).
		Take(&member).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return permission.ErrPermissionDenied
	}
	if err != nil {
		return err
	}
	if member.Permission != entity.KBMemberPermissionEdit {
		return permission.ErrPermissionDenied
	}
	return nil
}

// RequireKBView verifies the caller may read the directory tree: any user
// with visibility of the knowledge base.
func (s *KBFolderService) RequireKBView(ctx context.Context, datasetID, userID string) error {
	allowed, err := s.memberDAO.HasKBAccess(ctx, dao.DB, datasetID, userID)
	if err != nil {
		return err
	}
	if !allowed {
		return fmt.Errorf("知识库不存在或无权限访问")
	}
	return nil
}

// List returns one level of the directory tree.
func (s *KBFolderService) List(ctx context.Context, datasetID, parentID string) ([]entity.KBFolder, error) {
	var folders []entity.KBFolder
	if err := dao.DB.WithContext(ctx).
		Where("kb_id = ? AND parent_id = ?", datasetID, strings.TrimSpace(parentID)).
		Order("name").
		Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

// folderPath assembles the materialized path of a folder under parent.
func folderPath(parent *entity.KBFolder, id string) string {
	prefix := "/"
	if parent != nil {
		prefix = parent.Path
		if !strings.HasSuffix(prefix, "/") {
			prefix += "/"
		}
	}
	return prefix + id + "/"
}

// Create adds a folder under parentID ("" = root). Same-parent names are
// unique; the duplicate is rejected with a friendly error before the unique
// index answers.
func (s *KBFolderService) Create(ctx context.Context, datasetID, userID, parentID, name string) (*entity.KBFolder, error) {
	if err := s.RequireKBEdit(ctx, datasetID, userID); err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, &KBFolderError{Message: "目录名称不能为空"}
	}
	if len(name) > 128 {
		return nil, &KBFolderError{Message: "目录名称过长"}
	}
	var parent *entity.KBFolder
	parentID = strings.TrimSpace(parentID)
	if parentID != "" {
		p := &entity.KBFolder{}
		if err := dao.DB.WithContext(ctx).
			Where("id = ? AND kb_id = ?", parentID, datasetID).
			Take(p).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, &KBFolderError{Message: "上级目录不存在"}
			}
			return nil, err
		}
		parent = p
	}
	folder := &entity.KBFolder{
		ID:       common.GenerateUUID(),
		KbID:     datasetID,
		ParentID: parentID,
		Name:     name,
	}
	folder.Path = folderPath(parent, folder.ID)
	if err := dao.DB.WithContext(ctx).Create(folder).Error; err != nil {
		return nil, err
	}
	return folder, nil
}

// Rename updates a folder's name.
func (s *KBFolderService) Rename(ctx context.Context, datasetID, userID, folderID, name string) error {
	if err := s.RequireKBEdit(ctx, datasetID, userID); err != nil {
		return err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return &KBFolderError{Message: "目录名称不能为空"}
	}
	var folder entity.KBFolder
	if err := dao.DB.WithContext(ctx).
		Where("id = ? AND kb_id = ?", folderID, datasetID).
		Take(&folder).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &KBFolderError{Message: "目录不存在"}
		}
		return err
	}
	var count int64
	if err := dao.DB.WithContext(ctx).Model(&entity.KBFolder{}).
		Where("kb_id = ? AND parent_id = ? AND name = ? AND id <> ?", datasetID, folder.ParentID, name, folderID).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return &KBFolderError{Message: "同级目录下已存在同名目录"}
	}
	return dao.DB.WithContext(ctx).Model(&entity.KBFolder{}).
		Where("id = ?", folderID).
		Update("name", name).Error
}

// Delete removes an empty folder: no child folders and no filed documents.
func (s *KBFolderService) Delete(ctx context.Context, datasetID, userID, folderID string) error {
	if err := s.RequireKBEdit(ctx, datasetID, userID); err != nil {
		return err
	}
	var folder entity.KBFolder
	if err := dao.DB.WithContext(ctx).
		Where("id = ? AND kb_id = ?", folderID, datasetID).
		Take(&folder).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &KBFolderError{Message: "目录不存在"}
		}
		return err
	}
	var childCount int64
	if err := dao.DB.WithContext(ctx).Model(&entity.KBFolder{}).
		Where("kb_id = ? AND parent_id = ?", datasetID, folderID).
		Count(&childCount).Error; err != nil {
		return err
	}
	if childCount > 0 {
		return &KBFolderError{Message: "请先删除子目录"}
	}
	var docCount int64
	if err := dao.DB.WithContext(ctx).Model(&entity.Document{}).
		Where("kb_id = ? AND folder_id = ?", datasetID, folderID).
		Count(&docCount).Error; err != nil {
		return err
	}
	if docCount > 0 {
		return &KBFolderError{Message: fmt.Sprintf("目录下仍有 %d 个文档，请先移出", docCount)}
	}
	return dao.DB.WithContext(ctx).Where("id = ?", folderID).Delete(&entity.KBFolder{}).Error
}

// MoveDocument files one document into folderID ("" = unfiled root).
func (s *KBFolderService) MoveDocument(ctx context.Context, datasetID, userID, documentID, folderID string) error {
	if err := s.RequireKBEdit(ctx, datasetID, userID); err != nil {
		return err
	}
	folderID = strings.TrimSpace(folderID)
	if folderID != "" {
		var count int64
		if err := dao.DB.WithContext(ctx).Model(&entity.KBFolder{}).
			Where("id = ? AND kb_id = ?", folderID, datasetID).
			Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return &KBFolderError{Message: "目标目录不存在"}
		}
	}
	result := dao.DB.WithContext(ctx).Model(&entity.Document{}).
		Where("id = ? AND kb_id = ?", documentID, datasetID).
		Update("folder_id", folderID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &KBFolderError{Message: "文档不存在"}
	}
	return nil
}
