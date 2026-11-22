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
	"context"
	"errors"
	"fmt"
	"strings"

	"ragflow/internal/common"
	"ragflow/internal/dao"
	"ragflow/internal/entity"

	"gorm.io/gorm"
)

// departmentDAO, roleDAO and kbMemberDAO back the enterprise permission
// endpoints. They hang off the shared admin Service so every handler keeps
// the single-service wiring.
func (s *Service) enterpriseDepartmentDAO() *dao.DepartmentDAO { return dao.NewDepartmentDAO() }
func (s *Service) enterpriseRoleDAO() *dao.RoleDAO             { return dao.NewRoleDAO() }
func (s *Service) enterpriseKBMemberDAO() *dao.KBMemberDAO     { return dao.NewKBMemberDAO() }

// ListDepartments returns the whole department tree as ordered rows.
func (s *Service) ListDepartments(ctx context.Context) ([]entity.Department, error) {
	return s.enterpriseDepartmentDAO().List(ctx, dao.DB)
}

// CreateDepartment creates a department under parentID ("" = root).
func (s *Service) CreateDepartment(ctx context.Context, name, parentID string) (*entity.Department, error) {
	return s.enterpriseDepartmentDAO().Create(ctx, dao.DB, name, parentID)
}

// RenameDepartment updates a department's name.
func (s *Service) RenameDepartment(ctx context.Context, id, name string) error {
	return s.enterpriseDepartmentDAO().Rename(ctx, dao.DB, id, name)
}

// MoveDepartment re-parents a department.
func (s *Service) MoveDepartment(ctx context.Context, id, newParentID string) error {
	return s.enterpriseDepartmentDAO().Move(ctx, dao.DB, id, newParentID)
}

// DeleteDepartment removes an empty department.
func (s *Service) DeleteDepartment(ctx context.Context, id string) error {
	return s.enterpriseDepartmentDAO().Delete(ctx, dao.DB, id)
}

// ListRoles returns every role with its permission codes.
func (s *Service) ListRoles(ctx context.Context) ([]map[string]interface{}, error) {
	roles, err := s.enterpriseRoleDAO().List(ctx, dao.DB)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(roles))
	for _, role := range roles {
		codes, err := s.enterpriseRoleDAO().PermissionCodes(ctx, dao.DB, role.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"id":          role.ID,
			"name":        role.Name,
			"description": role.Description,
			"permissions": codes,
			"create_time": role.CreateTime,
			"update_time": role.UpdateTime,
		})
	}
	return result, nil
}

// CreateRole creates a role with its permission grants.
func (s *Service) CreateRole(ctx context.Context, name, description string, permissions []string) (*entity.Role, error) {
	return s.enterpriseRoleDAO().Create(ctx, dao.DB, name, description, permissions)
}

// UpdateRole rewrites a role.
func (s *Service) UpdateRole(ctx context.Context, id, name, description string, permissions []string) error {
	return s.enterpriseRoleDAO().Update(ctx, dao.DB, id, name, description, permissions)
}

// DeleteRole removes a role no user holds.
func (s *Service) DeleteRole(ctx context.Context, id string) error {
	return s.enterpriseRoleDAO().Delete(ctx, dao.DB, id)
}

// ListFunctionPermissions returns the seeded permission catalogue.
func (s *Service) ListFunctionPermissions(ctx context.Context) ([]entity.FunctionPermission, error) {
	return s.enterpriseRoleDAO().ListFunctionPermissions(ctx, dao.DB)
}

func (s *Service) userByEmail(ctx context.Context, username string) (*entity.User, error) {
	users, err := s.userDAO.ListByEmail(ctx, dao.DB, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if len(users) == 0 {
		return nil, common.ErrUserNotFound
	}
	if len(users) > 1 {
		return nil, fmt.Errorf("exist more than 1 user: %s", username)
	}
	return users[0], nil
}

// AssignUserDepartment sets a user's department ("" = unassign).
func (s *Service) AssignUserDepartment(ctx context.Context, username, departmentID string) error {
	user, err := s.userByEmail(ctx, username)
	if err != nil {
		return err
	}
	if strings.TrimSpace(departmentID) != "" {
		if _, err := s.enterpriseDepartmentDAO().Get(ctx, dao.DB, departmentID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("部门不存在")
			}
			return err
		}
	}
	user.DepartmentID = strings.TrimSpace(departmentID)
	return s.userDAO.Update(ctx, dao.DB, user)
}

// AssignUserRole sets a user's role ("" = remove). The superuser never takes
// a role: it already holds every capability.
func (s *Service) AssignUserRole(ctx context.Context, username, roleID string) error {
	user, err := s.userByEmail(ctx, username)
	if err != nil {
		return err
	}
	if user.IsSuperuser != nil && *user.IsSuperuser {
		return fmt.Errorf("超级管理员不走角色体系")
	}
	if strings.TrimSpace(roleID) != "" {
		if _, err := s.enterpriseRoleDAO().Get(ctx, dao.DB, roleID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("角色不存在")
			}
			return err
		}
	}
	user.RoleID = strings.TrimSpace(roleID)
	return s.userDAO.Update(ctx, dao.DB, user)
}

// CountUserOwnedKnowledgebases returns how many knowledge bases the user owns.
func (s *Service) CountUserOwnedKnowledgebases(ctx context.Context, userID string) (int64, error) {
	var count int64
	if err := dao.DB.WithContext(ctx).Model(&entity.Knowledgebase{}).
		Where("status = ? AND COALESCE(NULLIF(TRIM(user_id), ''), created_by) = ?", string(entity.StatusValid), userID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// ListAdminKnowledgebases lists every knowledge base with owner and department
// facts, optionally filtered by keyword or the owner's department.
func (s *Service) ListAdminKnowledgebases(ctx context.Context, keyword, departmentID string) ([]map[string]interface{}, error) {
	query := dao.DB.WithContext(ctx).Model(&entity.Knowledgebase{}).
		Joins("JOIN user owner ON owner.id = COALESCE(NULLIF(TRIM(knowledgebase.user_id), ''), knowledgebase.created_by)").
		Where("knowledgebase.status = ?", string(entity.StatusValid)).
		Select("knowledgebase.*, owner.email AS owner_email, owner.nickname AS owner_nickname, owner.department_id AS owner_department_id")
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		query = query.Where("knowledgebase.name LIKE ?", "%"+keyword+"%")
	}
	if departmentID = strings.TrimSpace(departmentID); departmentID != "" {
		query = query.Where("owner.department_id = ?", departmentID)
	}
	type kbRow struct {
		entity.Knowledgebase
		OwnerEmail        string `gorm:"column:owner_email"`
		OwnerNickname     string `gorm:"column:owner_nickname"`
		OwnerDepartmentID string `gorm:"column:owner_department_id"`
	}
	var rows []kbRow
	if err := query.Order("knowledgebase.create_time DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	departmentNames, err := s.departmentNameMap(ctx)
	if err != nil {
		return nil, err
	}
	memberCounts, err := s.kbMemberCountMap(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		result = append(result, map[string]interface{}{
			"id":               row.ID,
			"name":             row.Name,
			"avatar":           row.Avatar,
			"description":      row.Description,
			"doc_num":          row.DocNum,
			"token_num":        row.TokenNum,
			"chunk_num":        row.ChunkNum,
			"owner_user_id":    row.UserID,
			"owner_email":      row.OwnerEmail,
			"owner_nickname":   row.OwnerNickname,
			"department_id":    row.OwnerDepartmentID,
			"department_name":  departmentNames[row.OwnerDepartmentID],
			"member_count":     memberCounts[row.ID],
			"create_time":      row.CreateTime,
		})
	}
	return result, nil
}

func (s *Service) departmentNameMap(ctx context.Context) (map[string]string, error) {
	departments, err := s.enterpriseDepartmentDAO().List(ctx, dao.DB)
	if err != nil {
		return nil, err
	}
	names := make(map[string]string, len(departments))
	for _, department := range departments {
		names[department.ID] = department.Name
	}
	return names, nil
}

func (s *Service) kbMemberCountMap(ctx context.Context) (map[string]int64, error) {
	type row struct {
		KbID  string `gorm:"column:kb_id"`
		Count int64  `gorm:"column:count"`
	}
	var rows []row
	if err := dao.DB.WithContext(ctx).Model(&entity.KBMember{}).
		Select("kb_id, COUNT(*) AS count").
		Group("kb_id").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	counts := make(map[string]int64, len(rows))
	for _, r := range rows {
		counts[r.KbID] = r.Count
	}
	return counts, nil
}

// ListKBMembers returns one knowledge base's member rows joined with user facts.
func (s *Service) ListKBMembers(ctx context.Context, kbID string) ([]map[string]interface{}, error) {
	members, err := s.enterpriseKBMemberDAO().ListByKB(ctx, dao.DB, kbID)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(members))
	for _, member := range members {
		var user entity.User
		if err := dao.DB.WithContext(ctx).Where("id = ?", member.UserID).Take(&user).Error; err != nil {
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

// SetKBMember grants one user a level on one knowledge base. Owners and
// superusers cannot be granted: they already hold full access.
func (s *Service) SetKBMember(ctx context.Context, kbID, userID, permission string) error {
	var kb entity.Knowledgebase
	if err := dao.DB.WithContext(ctx).Where("id = ? AND status = ?", kbID, string(entity.StatusValid)).Take(&kb).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("知识库不存在")
		}
		return err
	}
	var user entity.User
	if err := dao.DB.WithContext(ctx).Where("id = ?", userID).Take(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("用户不存在")
		}
		return err
	}
	if user.IsSuperuser != nil && *user.IsSuperuser {
		return fmt.Errorf("超级管理员无需授权")
	}
	ownerID := ownerIDOf(kb.UserID, kb.CreatedBy)
	if ownerID == userID {
		return fmt.Errorf("该用户已是知识库所有者")
	}
	return s.enterpriseKBMemberDAO().Upsert(ctx, dao.DB, kbID, userID, permission)
}

// RemoveKBMember revokes one user's grant on one knowledge base.
func (s *Service) RemoveKBMember(ctx context.Context, kbID, userID string) error {
	return s.enterpriseKBMemberDAO().Remove(ctx, dao.DB, kbID, userID)
}

func ownerIDOf(userID, createdBy string) string {
	if strings.TrimSpace(userID) != "" {
		return strings.TrimSpace(userID)
	}
	return strings.TrimSpace(createdBy)
}

// TransferKBOwnership hands a knowledge base to another user: the new owner
// takes the row, the old owner keeps view access unless already a member,
// and any stale new-owner member row is removed. All in one transaction.
func (s *Service) TransferKBOwnership(ctx context.Context, kbID, targetUserID string) error {
	return dao.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var kb entity.Knowledgebase
		if err := tx.Where("id = ? AND status = ?", kbID, string(entity.StatusValid)).Take(&kb).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("知识库不存在")
			}
			return err
		}
		var target entity.User
		if err := tx.Where("id = ?", targetUserID).Take(&target).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("目标用户不存在")
			}
			return err
		}
		if target.IsActive != "1" {
			return fmt.Errorf("目标账号已停用，不能接受转让")
		}
		oldOwnerID := ownerIDOf(kb.UserID, kb.CreatedBy)
		if oldOwnerID == targetUserID {
			return fmt.Errorf("该用户已是知识库所有者")
		}
		if err := tx.Model(&entity.Knowledgebase{}).Where("id = ?", kb.ID).
			Updates(map[string]any{"user_id": targetUserID, "tenant_id": targetUserID}).Error; err != nil {
			return err
		}
		var existingMember entity.KBMember
		err := tx.Where("kb_id = ? AND user_id = ?", kb.ID, targetUserID).Take(&existingMember).Error
		if err == nil {
			if err := tx.Where("id = ?", existingMember.ID).Delete(&entity.KBMember{}).Error; err != nil {
				return err
			}
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var oldOwnerMember entity.KBMember
		err = tx.Where("kb_id = ? AND user_id = ?", kb.ID, oldOwnerID).Take(&oldOwnerMember).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(&entity.KBMember{
				ID:         common.GenerateUUID(),
				KbID:       kb.ID,
				UserID:     oldOwnerID,
				Permission: entity.KBMemberPermissionView,
			}).Error
		}
		return err
	})
}

// CreateUserEnterpriseRequest carries the enterprise additions to CreateUser.
type CreateUserEnterpriseRequest struct {
	DepartmentID string `json:"department_id"`
	RoleID       string `json:"role_id"`
}

// ApplyUserEnterpriseFields validates and applies department/role to a freshly
// created user, before the creation transaction commits.
func (s *Service) ApplyUserEnterpriseFields(ctx context.Context, user *entity.User, departmentID, roleID string) error {
	if strings.TrimSpace(departmentID) != "" {
		if _, err := s.enterpriseDepartmentDAO().Get(ctx, dao.DB, departmentID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("部门不存在")
			}
			return err
		}
		user.DepartmentID = strings.TrimSpace(departmentID)
	}
	if strings.TrimSpace(roleID) != "" {
		if _, err := s.enterpriseRoleDAO().Get(ctx, dao.DB, roleID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("角色不存在")
			}
			return err
		}
		user.RoleID = strings.TrimSpace(roleID)
	}
	return nil
}

// EnrichUserListWithEnterprise adds department and role names to the admin
// user list rows.
func (s *Service) EnrichUserListWithEnterprise(ctx context.Context, users []map[string]interface{}) error {
	departmentNames, err := s.departmentNameMap(ctx)
	if err != nil {
		return err
	}
	roles, err := s.enterpriseRoleDAO().List(ctx, dao.DB)
	if err != nil {
		return err
	}
	roleNames := make(map[string]string, len(roles))
	for _, role := range roles {
		roleNames[role.ID] = role.Name
	}
	for _, row := range users {
		user, ok := row["_user"].(*entity.User)
		if !ok {
			continue
		}
		row["department_id"] = user.DepartmentID
		row["department_name"] = departmentNames[user.DepartmentID]
		row["role_id"] = user.RoleID
		row["role_name"] = roleNames[user.RoleID]
		delete(row, "_user")
	}
	return nil
}
