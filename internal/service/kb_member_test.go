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
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"ragflow/internal/dao"
	"ragflow/internal/entity"
)

func setupKBMemberTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("failed to acquire sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Knowledgebase{},
		&entity.Tenant{},
		&entity.UserTenant{},
		&entity.KBMember{},
		&entity.Department{},
	); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	pushServiceDB(t, db)
	return db
}

func insertKBMemberTestUser(t *testing.T, id, email string, isSuperuser bool) {
	t.Helper()
	user := entity.User{ID: id, Email: email, Nickname: id, IsActive: "1"}
	if isSuperuser {
		super := true
		user.IsSuperuser = &super
	}
	if err := dao.DB.Create(&user).Error; err != nil {
		t.Fatalf("create user %s: %v", id, err)
	}
}

func insertKBMemberTestKB(t *testing.T, id, ownerID string) {
	t.Helper()
	status := string(entity.StatusValid)
	kb := entity.Knowledgebase{ID: id, UserID: ownerID, TenantID: ownerID, Name: "kb-" + id, EmbdID: "embd-1", CreatedBy: ownerID, Permission: "me", Status: &status}
	if err := dao.DB.Create(&kb).Error; err != nil {
		t.Fatalf("create kb %s: %v", id, err)
	}
}

func kbMemberRows(t *testing.T, kbID string) map[string]string {
	t.Helper()
	members, err := dao.NewKBMemberDAO().ListByKB(t.Context(), dao.DB, kbID)
	if err != nil {
		t.Fatal(err)
	}
	rows := make(map[string]string, len(members))
	for _, member := range members {
		rows[member.UserID] = member.Permission
	}
	return rows
}

func TestKBMemberBatchGrantsTargetsIndependently(t *testing.T) {
	setupKBMemberTestDB(t)
	owner, targetA, targetB, super := "owner-1", "user-a", "user-b", "root-1"
	insertKBMemberTestUser(t, owner, owner+"@example.com", false)
	insertKBMemberTestUser(t, targetA, targetA+"@example.com", false)
	insertKBMemberTestUser(t, targetB, targetB+"@example.com", false)
	insertKBMemberTestUser(t, super, super+"@example.com", true)
	insertKBMemberTestKB(t, "kb-1", owner)
	ctx := serviceTestContext(t, owner, owner)

	// One invalid target must not block the others; each failure is reported.
	added, failures, err := NewKBMemberService().Batch(ctx, "kb-1", owner, []string{targetA, super, "ghost@example.com", targetB}, entity.KBMemberPermissionEdit)
	if err != nil {
		t.Fatal(err)
	}
	if added != 2 {
		t.Fatalf("added = %d, want 2", added)
	}
	if len(failures) != 2 {
		t.Fatalf("failures = %+v, want 2 entries", failures)
	}
	if failures[0].UserID != super || failures[1].UserID != "ghost@example.com" {
		t.Fatalf("failures = %+v, want superuser and ghost entries", failures)
	}
	rows := kbMemberRows(t, "kb-1")
	if rows[targetA] != entity.KBMemberPermissionEdit || rows[targetB] != entity.KBMemberPermissionEdit {
		t.Fatalf("rows = %v, want both targets with edit", rows)
	}
}

func TestKBMemberBatchRejectsBadInputAndNonOwner(t *testing.T) {
	setupKBMemberTestDB(t)
	owner, member := "owner-1", "user-a"
	insertKBMemberTestUser(t, owner, owner+"@example.com", false)
	insertKBMemberTestUser(t, member, member+"@example.com", false)
	insertKBMemberTestKB(t, "kb-1", owner)
	ownerCtx := serviceTestContext(t, owner, owner)
	memberCtx := serviceTestContext(t, member, owner)
	svc := NewKBMemberService()

	if _, _, err := svc.Batch(ownerCtx, "kb-1", owner, []string{member}, "admin"); err == nil {
		t.Fatal("Batch accepted an unsupported permission level")
	}
	if _, _, err := svc.Batch(memberCtx, "kb-1", member, []string{owner}, entity.KBMemberPermissionView); err == nil {
		t.Fatal("Batch allowed a non-owner to manage members")
	}
	if _, _, err := svc.Batch(ownerCtx, "kb-1", owner, nil, entity.KBMemberPermissionView); err == nil {
		t.Fatal("Batch accepted an empty target list")
	}
}

func TestKBMemberCandidatesExcludesOwnerAndSuperuser(t *testing.T) {
	setupKBMemberTestDB(t)
	owner, memberA, memberB, super := "owner-1", "user-a", "user-b", "root-1"
	insertKBMemberTestUser(t, owner, owner+"@example.com", false)
	insertKBMemberTestUser(t, memberA, memberA+"@example.com", false)
	insertKBMemberTestUser(t, memberB, memberB+"@example.com", false)
	insertKBMemberTestUser(t, super, super+"@example.com", true)
	insertKBMemberTestKB(t, "kb-1", owner)
	departmentDAO := dao.NewDepartmentDAO()
	root, err := departmentDAO.Create(t.Context(), dao.DB, "Company", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := departmentDAO.Create(t.Context(), dao.DB, "Sub", root.ID); err != nil {
		t.Fatal(err)
	}
	if err := dao.DB.Model(&entity.User{}).Where("id = ?", memberA).Update("department_id", root.ID).Error; err != nil {
		t.Fatal(err)
	}
	ctx := serviceTestContext(t, owner, owner)

	departments, users, err := NewKBMemberService().Candidates(ctx, "kb-1", owner)
	if err != nil {
		t.Fatal(err)
	}
	if len(departments) != 2 {
		t.Fatalf("departments = %d, want 2", len(departments))
	}
	if len(users) != 2 {
		t.Fatalf("users = %+v, want the two non-owner non-superuser accounts", users)
	}
	seen := make(map[string]map[string]interface{}, len(users))
	for _, user := range users {
		seen[user["user_id"].(string)] = user
	}
	if _, ok := seen[memberA]; !ok {
		t.Fatalf("users = %+v, want member %s present", users, memberA)
	}
	if seen[memberA]["department_id"] != root.ID {
		t.Fatalf("department_id = %v, want %s", seen[memberA]["department_id"], root.ID)
	}
	if _, ok := seen[owner]; ok {
		t.Fatal("candidates must not include the owner")
	}
	if _, ok := seen[super]; ok {
		t.Fatal("candidates must not include the superuser")
	}

	if _, _, err := NewKBMemberService().Candidates(serviceTestContext(t, memberB, owner), "kb-1", memberB); err == nil {
		t.Fatal("Candidates allowed a non-owner")
	}
}
