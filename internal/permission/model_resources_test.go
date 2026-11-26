//
// Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package permission

import (
	"context"
	"errors"
	"net/url"
	"testing"

	"ragflow/internal/entity"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func sharedModelProviderFixture(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+url.QueryEscape(t.Name())+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&entity.TenantModelProvider{}, &entity.TenantModelInstance{}, &entity.TenantModel{}, &entity.UserTenant{}); err != nil {
		t.Fatalf("migrate model tables: %v", err)
	}

	valid := string(entity.StatusValid)
	// The superuser's shared provider lives in its own tenant; the regular
	// provider belongs to a third tenant whose user is unrelated.
	sharedProvider := entity.TenantModelProvider{
		ID: "provider-shared", UserID: "super-1", ProviderName: "OpenAI",
		TenantID: "super-tenant", IsShared: true,
	}
	privateProvider := entity.TenantModelProvider{
		ID: "provider-private", UserID: "user-3", ProviderName: "Ollama",
		TenantID: "user-3-tenant",
	}
	instance := entity.TenantModelInstance{
		ID: "instance-shared", InstanceName: "primary", ProviderID: sharedProvider.ID,
		Status: "active",
	}
	model := entity.TenantModel{
		ID: "model-shared", ModelName: "gpt-4o", ProviderID: sharedProvider.ID,
		InstanceID: instance.ID, Status: "active",
	}
	membership := entity.UserTenant{
		ID: "membership-1", UserID: "user-1", TenantID: "user-1-tenant",
		Role: string(RoleOwner), Status: &valid,
	}
	superMembership := entity.UserTenant{
		ID: "membership-super", UserID: "super-1", TenantID: "super-tenant",
		Role: string(RoleOwner), Status: &valid,
	}
	privateMembership := entity.UserTenant{
		ID: "membership-private", UserID: "user-3", TenantID: "user-3-tenant",
		Role: string(RoleOwner), Status: &valid,
	}
	for _, row := range []interface{}{&sharedProvider, &privateProvider, &instance, &model, &membership, &superMembership, &privateMembership} {
		if err := db.Create(row).Error; err != nil {
			t.Fatalf("create fixture row: %v", err)
		}
	}
	return db
}

func TestDatabaseCheckerAuthorizesSharedModelProviderForForeignUser(t *testing.T) {
	db := sharedModelProviderFixture(t)
	checker := newCommunityDatabaseChecker(db)
	foreign := WithIdentity(context.Background(), "user-1", "user-1-tenant")

	// The shared provider is readable and usable by everyone.
	providerRef := ResourceRef{Kind: ResourceKindModelProvider, ID: "provider-shared"}
	if err := checker.CheckResource(foreign, providerRef, OperationRead); err != nil {
		t.Errorf("shared provider CheckResource(read) error = %v, want nil", err)
	}
	for _, operation := range []Operation{OperationCreate, OperationUpdate, OperationDelete} {
		if err := checker.CheckResource(foreign, providerRef, operation); !errors.Is(err, ErrPermissionDenied) {
			t.Errorf("shared provider CheckResource(%s) error = %v, want permission denied", operation, err)
		}
	}

	instanceRef := ResourceRef{Kind: ResourceKindModelInstance, ID: "instance-shared"}
	for _, operation := range []Operation{OperationRead, OperationUse} {
		if err := checker.CheckResource(foreign, instanceRef, operation); err != nil {
			t.Errorf("shared instance CheckResource(%s) error = %v, want nil", operation, err)
		}
	}
	if err := checker.CheckResource(foreign, instanceRef, OperationDelete); !errors.Is(err, ErrPermissionDenied) {
		t.Errorf("shared instance CheckResource(delete) error = %v, want permission denied", err)
	}

	if err := checker.CheckResource(foreign, ResourceRef{Kind: ResourceKindModel, ID: "model-shared"}, OperationUse); err != nil {
		t.Errorf("shared model CheckResource(use) error = %v, want nil", err)
	}

	// A regular provider stays tenant-scoped: other users cannot even read it.
	if err := checker.CheckResource(foreign, ResourceRef{Kind: ResourceKindModelProvider, ID: "provider-private"}, OperationRead); !errors.Is(err, ErrPermissionDenied) {
		t.Errorf("private provider CheckResource(read) error = %v, want permission denied", err)
	}
}

func TestModelQueryScopeIncludesSharedProviders(t *testing.T) {
	db := sharedModelProviderFixture(t)
	checker := newCommunityDatabaseChecker(db)
	foreign := WithIdentity(context.Background(), "user-1", "user-1-tenant")

	providerScope, err := checker.QueryScope(foreign, ScopeQuery{Kind: ResourceKindModelProvider, Operation: OperationRead})
	if err != nil {
		t.Fatalf("provider QueryScope: %v", err)
	}
	var providers []entity.TenantModelProvider
	if err := providerScope.Apply(db.Model(&entity.TenantModelProvider{})).Find(&providers).Error; err != nil {
		t.Fatalf("scope provider list: %v", err)
	}
	if len(providers) != 1 || providers[0].ID != "provider-shared" {
		t.Fatalf("scoped providers = %+v, want only the shared provider", providers)
	}

	// Model use over a shared provider resolves through the same scope.
	modelScope, err := checker.QueryScope(foreign, ScopeQuery{Kind: ResourceKindModel, Operation: OperationUse})
	if err != nil {
		t.Fatalf("model QueryScope: %v", err)
	}
	var models []entity.TenantModel
	if err := modelScope.Apply(db.Model(&entity.TenantModel{})).Find(&models).Error; err != nil {
		t.Fatalf("scope model list: %v", err)
	}
	if len(models) != 1 || models[0].ID != "model-shared" {
		t.Fatalf("scoped models = %+v, want only the shared provider's model", models)
	}
}
