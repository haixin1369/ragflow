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
	"fmt"
	"strings"

	"ragflow/internal/common"
	"ragflow/internal/entity"

	"gorm.io/gorm"
)

// DepartmentDAO owns the company/department tree.
type DepartmentDAO struct{}

// NewDepartmentDAO creates the department DAO.
func NewDepartmentDAO() *DepartmentDAO { return &DepartmentDAO{} }

// DepartmentError is a domain error carrying a user-facing message.
type DepartmentError struct {
	Message string
}

func (e *DepartmentError) Error() string { return e.Message }

func departmentNodePath(parentPath string) string {
	if strings.TrimSpace(parentPath) == "" {
		return "/"
	}
	if strings.HasSuffix(parentPath, "/") {
		return parentPath
	}
	return parentPath + "/"
}

// Create inserts a department under parentID ("" = root) and materializes its
// path from the parent row.
func (d *DepartmentDAO) Create(ctx context.Context, tx *gorm.DB, name, parentID string) (*entity.Department, error) {
	if strings.TrimSpace(name) == "" {
		return nil, &DepartmentError{Message: "部门名称不能为空"}
	}
	exec := tx
	if exec == nil {
		exec = DB
	}
	var parent *entity.Department
	if strings.TrimSpace(parentID) != "" {
		parent = &entity.Department{}
		if err := exec.WithContext(ctx).Where("id = ?", parentID).Take(parent).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, &DepartmentError{Message: "上级部门不存在"}
			}
			return nil, err
		}
	}
	department := &entity.Department{
		ID:       common.GenerateUUID(),
		Name:     strings.TrimSpace(name),
		ParentID: strings.TrimSpace(parentID),
	}
	department.Path = departmentNodePath(parentPathOf(parent)) + department.ID + "/"
	if err := exec.WithContext(ctx).Create(department).Error; err != nil {
		return nil, err
	}
	return department, nil
}

func parentPathOf(parent *entity.Department) string {
	if parent == nil {
		return ""
	}
	return parent.Path
}

// Get reads one department by id.
func (d *DepartmentDAO) Get(ctx context.Context, tx *gorm.DB, id string) (*entity.Department, error) {
	exec := tx
	if exec == nil {
		exec = DB
	}
	var department entity.Department
	if err := exec.WithContext(ctx).Where("id = ?", id).Take(&department).Error; err != nil {
		return nil, err
	}
	return &department, nil
}

// List returns every department ordered for tree assembly (parents before
// children when the tree was built top-down).
func (d *DepartmentDAO) List(ctx context.Context, tx *gorm.DB) ([]entity.Department, error) {
	exec := tx
	if exec == nil {
		exec = DB
	}
	var departments []entity.Department
	if err := exec.WithContext(ctx).Order("path").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

// Rename updates the department name.
func (d *DepartmentDAO) Rename(ctx context.Context, tx *gorm.DB, id, name string) error {
	if strings.TrimSpace(name) == "" {
		return &DepartmentError{Message: "部门名称不能为空"}
	}
	exec := tx
	if exec == nil {
		exec = DB
	}
	result := exec.WithContext(ctx).Model(&entity.Department{}).
		Where("id = ?", id).
		Update("name", strings.TrimSpace(name))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &DepartmentError{Message: "部门不存在"}
	}
	return nil
}

// Move re-parents a department and rewrites its subtree paths. It rejects
// moving a department into one of its own descendants.
func (d *DepartmentDAO) Move(ctx context.Context, tx *gorm.DB, id, newParentID string) error {
	exec := tx
	if exec == nil {
		exec = DB
	}
	return exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		var department entity.Department
		if err := t.Where("id = ?", id).Take(&department).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &DepartmentError{Message: "部门不存在"}
			}
			return err
		}
		newPathPrefix := "/"
		if strings.TrimSpace(newParentID) != "" {
			var parent entity.Department
			if err := t.Where("id = ?", newParentID).Take(&parent).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return &DepartmentError{Message: "上级部门不存在"}
				}
				return err
			}
			if strings.Contains(parent.Path, "/"+department.ID+"/") {
				return &DepartmentError{Message: "不能移动到自身或其子部门下"}
			}
			newPathPrefix = departmentNodePath(parent.Path)
		}
		oldPrefix := department.Path
		newPath := newPathPrefix + department.ID + "/"
		if err := t.Model(&entity.Department{}).Where("id = ?", department.ID).
			Updates(map[string]any{"parent_id": strings.TrimSpace(newParentID), "path": newPath}).Error; err != nil {
			return err
		}
		// Rewrite descendant paths: replace the old ancestor chain with the new one.
		var descendants []entity.Department
		if err := t.Where("path LIKE ?", oldPrefix+"%").Where("id <> ?", department.ID).Find(&descendants).Error; err != nil {
			return err
		}
		for _, descendant := range descendants {
			newPath := newPath + strings.TrimPrefix(descendant.Path, oldPrefix)
			if err := t.Model(&entity.Department{}).Where("id = ?", descendant.ID).
				Update("path", newPath).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// Delete removes a department. It fails closed when the department still has
// child departments or assigned users.
func (d *DepartmentDAO) Delete(ctx context.Context, tx *gorm.DB, id string) error {
	exec := tx
	if exec == nil {
		exec = DB
	}
	return exec.WithContext(ctx).Transaction(func(t *gorm.DB) error {
		var childCount int64
		if err := t.Model(&entity.Department{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
			return err
		}
		if childCount > 0 {
			return &DepartmentError{Message: "请先删除或移出子部门"}
		}
		var userCount int64
		if err := t.Model(&entity.User{}).Where("department_id = ?", id).Count(&userCount).Error; err != nil {
			return err
		}
		if userCount > 0 {
			return &DepartmentError{Message: fmt.Sprintf("仍有 %d 个用户归属该部门，请先移出", userCount)}
		}
		result := t.Where("id = ?", id).Delete(&entity.Department{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return &DepartmentError{Message: "部门不存在"}
		}
		return nil
	})
}
