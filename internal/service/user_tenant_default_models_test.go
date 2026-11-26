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

package service

import (
	"testing"

	"gorm.io/gorm"

	"ragflow/internal/entity"
)

// seedDefaultModelFallbackScope inserts a superuser with default models on a
// shared provider and a member without any default-model selection.
func seedDefaultModelFallbackScope(t *testing.T, db *gorm.DB, memberEmbdID string, memberTenantEmbdID *string) {
	t.Helper()
	activeStatus := "1"
	super := true
	rows := []interface{}{
		&entity.User{ID: "superuser-1", Email: "admin@test.io", Nickname: "admin", IsActive: "1", IsSuperuser: &super},
		&entity.User{ID: "user-2", Email: "member@test.io", Nickname: "member", IsActive: "1"},
		&entity.UserTenant{
			ID: "ut-super", UserID: "superuser-1", TenantID: "superuser-1", Role: "owner", InvitedBy: "superuser-1", Status: &activeStatus,
			LLMID: "chat-model@default@OpenAI", EmbdID: "embed-model@default@OpenAI",
			TenantLLMID: sptr("model-super-chat"), TenantEmbdID: sptr("model-super-embed"),
		},
		&entity.UserTenant{
			ID: "ut-member", UserID: "user-2", TenantID: "user-2", Role: "owner", InvitedBy: "user-2", Status: &activeStatus,
			EmbdID: memberEmbdID, TenantEmbdID: memberTenantEmbdID,
		},
		&entity.TenantModelProvider{ID: "provider-super", UserID: "superuser-1", TenantID: "superuser-1", ProviderName: "OpenAI", IsShared: true},
		&entity.TenantModelInstance{ID: "instance-super", ProviderID: "provider-super", InstanceName: "default", APIKey: "sk-test", Status: "active", Extra: "{}"},
		&entity.TenantModel{ID: "model-super-chat", ProviderID: "provider-super", InstanceID: "instance-super", ModelName: "chat-model", ModelType: int(entity.ModelTypeChat), Status: "active"},
		&entity.TenantModel{ID: "model-super-embed", ProviderID: "provider-super", InstanceID: "instance-super", ModelName: "embed-model", ModelType: int(entity.ModelTypeEmbedding), Status: "active"},
	}
	for _, row := range rows {
		if err := db.Create(row).Error; err != nil {
			t.Fatalf("failed to seed %T: %v", row, err)
		}
	}
}

func defaultModelIDsByType(items []ModelItem) map[string]string {
	ids := make(map[string]string, len(items))
	for _, item := range items {
		ids[item.ModelType] = item.ModelID
	}
	return ids
}

func TestListDefaultModelsFallsBackToSuperuserDefaults(t *testing.T) {
	db := setupModelProviderServiceTestDB(t)
	useModelProviderServiceTestDB(t, db)
	seedDefaultModelFallbackScope(t, db, "", nil)

	items, err := NewUserTenantService().ListDefaultModels(serviceTestContext(t, "user-2", "user-2"))
	if err != nil {
		t.Fatalf("ListDefaultModels() error = %v", err)
	}
	ids := defaultModelIDsByType(items)
	if ids["chat"] != "model-super-chat" {
		t.Fatalf("chat model = %q, want superuser default", ids["chat"])
	}
	if ids["embedding"] != "model-super-embed" {
		t.Fatalf("embedding model = %q, want superuser default", ids["embedding"])
	}
	if len(items) != 2 {
		t.Fatalf("items = %#v, want exactly the two fallback models", items)
	}
}

func TestListDefaultModelsPrefersOwnSelectionOverSuperuserFallback(t *testing.T) {
	db := setupModelProviderServiceTestDB(t)
	useModelProviderServiceTestDB(t, db)
	seedDefaultModelFallbackScope(t, db, "embed-member@default@Ollama", sptr("model-member-embed"))
	memberRows := []interface{}{
		&entity.TenantModelProvider{ID: "provider-member", UserID: "user-2", TenantID: "user-2", ProviderName: "Ollama"},
		&entity.TenantModelInstance{ID: "instance-member", ProviderID: "provider-member", InstanceName: "default", APIKey: "sk-member", Status: "active", Extra: "{}"},
		&entity.TenantModel{ID: "model-member-embed", ProviderID: "provider-member", InstanceID: "instance-member", ModelName: "embed-member", ModelType: int(entity.ModelTypeEmbedding), Status: "active"},
	}
	for _, row := range memberRows {
		if err := db.Create(row).Error; err != nil {
			t.Fatalf("failed to seed %T: %v", row, err)
		}
	}

	items, err := NewUserTenantService().ListDefaultModels(serviceTestContext(t, "user-2", "user-2"))
	if err != nil {
		t.Fatalf("ListDefaultModels() error = %v", err)
	}
	ids := defaultModelIDsByType(items)
	if ids["embedding"] != "model-member-embed" {
		t.Fatalf("embedding model = %q, want the member's own selection", ids["embedding"])
	}
	if ids["chat"] != "model-super-chat" {
		t.Fatalf("chat model = %q, want superuser fallback", ids["chat"])
	}
}
