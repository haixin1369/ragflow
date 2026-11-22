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
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"ragflow/internal/entity"
)

func newEnterpriseSchemaTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Document{},
		&entity.Department{},
		&entity.Role{},
		&entity.RolePermission{},
		&entity.FunctionPermission{},
		&entity.KBMember{},
		&entity.KBFolder{},
	); err != nil {
		t.Fatalf("migrate enterprise schema: %v", err)
	}
	return db
}

// TestEnterpriseSchemaMigrateConverges runs the new enterprise models through
// AutoMigrate twice: the second pass must not fail, which proves the declared
// indexes (including the named unique ones) converge instead of fighting the
// migrator on every startup. Only the new models are re-migrated: the glebarez
// sqlite migrator has a known second-pass quirk on the shared user model's
// time-typed indexed columns, which production MySQL/PostgreSQL does not hit.
func TestEnterpriseSchemaMigrateConverges(t *testing.T) {
	models := []interface{}{
		&entity.Department{},
		&entity.Role{},
		&entity.RolePermission{},
		&entity.FunctionPermission{},
		&entity.KBMember{},
		&entity.KBFolder{},
	}
	db := newEnterpriseSchemaTestDB(t)
	for pass := 0; pass < 2; pass++ {
		if err := db.AutoMigrate(models...); err != nil {
			t.Fatalf("converge pass %d: %v", pass, err)
		}
	}
}

// TestEnterpriseSchemaUniqueConstraints guards the uniqueness contracts the
// permission model relies on: role names, one member row per (kb, user), and
// no duplicate folder names under one parent.
func TestEnterpriseSchemaUniqueConstraints(t *testing.T) {
	db := newEnterpriseSchemaTestDB(t)

	if err := db.Create(&entity.Role{ID: "r1", Name: "editor"}).Error; err != nil {
		t.Fatalf("create role: %v", err)
	}
	if err := db.Create(&entity.Role{ID: "r2", Name: "editor"}).Error; err == nil {
		t.Fatal("duplicate role name accepted")
	}

	if err := db.Create(&entity.KBMember{ID: "m1", KbID: "kb1", UserID: "u1", Permission: entity.KBMemberPermissionView}).Error; err != nil {
		t.Fatalf("create kb_member: %v", err)
	}
	if err := db.Create(&entity.KBMember{ID: "m2", KbID: "kb1", UserID: "u1", Permission: entity.KBMemberPermissionEdit}).Error; err == nil {
		t.Fatal("duplicate (kb, user) member row accepted")
	}
	if err := db.Create(&entity.KBMember{ID: "m3", KbID: "kb1", UserID: "u2", Permission: entity.KBMemberPermissionView}).Error; err != nil {
		t.Fatalf("create second member on same kb: %v", err)
	}

	if err := db.Create(&entity.KBFolder{ID: "f1", KbID: "kb1", ParentID: "", Name: "合同"}).Error; err != nil {
		t.Fatalf("create kb_folder: %v", err)
	}
	if err := db.Create(&entity.KBFolder{ID: "f2", KbID: "kb1", ParentID: "", Name: "合同"}).Error; err == nil {
		t.Fatal("duplicate folder name under same parent accepted")
	}
	// The same name under a different parent or a different kb is fine.
	if err := db.Create(&entity.KBFolder{ID: "f3", KbID: "kb1", ParentID: "f1", Name: "合同"}).Error; err != nil {
		t.Fatalf("same name under different parent rejected: %v", err)
	}
	if err := db.Create(&entity.KBFolder{ID: "f4", KbID: "kb2", ParentID: "", Name: "合同"}).Error; err != nil {
		t.Fatalf("same name under different kb rejected: %v", err)
	}
}

// TestSeedFunctionPermissionsUpserts covers the startup seed: first run
// inserts the built-in catalogue, a changed built-in definition is rewritten,
// and role grants are never touched.
func TestSeedFunctionPermissionsUpserts(t *testing.T) {
	db := newEnterpriseSchemaTestDB(t)
	ctx := t.Context()

	if err := SeedFunctionPermissions(ctx, db); err != nil {
		t.Fatalf("seed: %v", err)
	}
	var count int64
	db.Model(&entity.FunctionPermission{}).Count(&count)
	if count != int64(len(entity.BuiltinFunctionPermissions())) {
		t.Fatalf("seeded %d rows, want %d", count, len(entity.BuiltinFunctionPermissions()))
	}

	// A grant pointing at one seeded code must survive a re-seed that rewrites
	// name and description.
	if err := db.Create(&entity.RolePermission{RoleID: "r1", PermissionCode: entity.PermissionKbCreate}).Error; err != nil {
		t.Fatalf("create role_permission: %v", err)
	}
	if err := db.Model(&entity.FunctionPermission{}).
		Where("code = ?", entity.PermissionKbCreate).
		Updates(map[string]any{"name": "stale", "description": "stale"}).Error; err != nil {
		t.Fatalf("mutate seeded row: %v", err)
	}
	if err := SeedFunctionPermissions(ctx, db); err != nil {
		t.Fatalf("re-seed: %v", err)
	}
	var restored entity.FunctionPermission
	if err := db.Where("code = ?", entity.PermissionKbCreate).Take(&restored).Error; err != nil {
		t.Fatalf("reload seeded row: %v", err)
	}
	for _, builtin := range entity.BuiltinFunctionPermissions() {
		if builtin.Code == entity.PermissionKbCreate {
			if restored.Name != builtin.Name || restored.Description != builtin.Description {
				t.Fatalf("re-seed did not restore builtin definition: %+v", restored)
			}
		}
	}
	var grants int64
	db.Model(&entity.RolePermission{}).Count(&grants)
	if grants != 1 {
		t.Fatalf("re-seed touched role_permission: %d grants, want 1", grants)
	}
}
