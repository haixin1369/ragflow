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

package entity

// Role is a superuser-defined bundle of function permissions. There are no
// built-in rows: the superuser account does not go through the role system
// and always has every capability.
type Role struct {
	ID          string `gorm:"column:id;primaryKey;size:32" json:"id"`
	Name        string `gorm:"column:name;size:64;not null;uniqueIndex:uni_role_name" json:"name"`
	Description string `gorm:"column:description;size:255;not null;default:''" json:"description"`
	BaseModel
}

// TableName returns the table name for the Role model.
func (Role) TableName() string {
	return "role"
}

// RolePermission links one role to one function-permission code. The composite
// primary key already answers "which roles carry code X" and "which codes does
// role R carry", so no secondary index is declared.
type RolePermission struct {
	RoleID         string `gorm:"column:role_id;size:32;primaryKey" json:"role_id"`
	PermissionCode string `gorm:"column:permission_code;size:64;primaryKey" json:"permission_code"`
}

// TableName returns the table name for the RolePermission model.
func (RolePermission) TableName() string {
	return "role_permission"
}

// FunctionPermission is one button-level permission point. The codes are
// built into the code base and seeded at startup; rows are never deleted by
// migration, only upserted.
type FunctionPermission struct {
	Code        string `gorm:"column:code;primaryKey;size:64" json:"code"`
	Name        string `gorm:"column:name;size:64;not null" json:"name"`
	Description string `gorm:"column:description;size:255;not null;default:''" json:"description"`
}

// TableName returns the table name for the FunctionPermission model.
func (FunctionPermission) TableName() string {
	return "function_permission"
}

// Function permission codes. A role holds a set of these; a user holds at most
// one role; the superuser holds every capability without a role. Document
// actions (upload/delete/reparse) are governed per knowledge base by its
// member grants, not by role permissions.
const (
	PermissionKbCreate    = "kb.create"
	PermissionChatCreate  = "chat.create"
	PermissionAgentCreate = "agent.create"
	PermissionFileManage  = "file.manage"
)

// BuiltinFunctionPermissions is the seeded catalogue in upsert order. Keep it
// in sync with the feature menus; new capability gates must register here.
// Codes removed from this catalogue are deleted by the seed on startup, along
// with any role grants referencing them.
func BuiltinFunctionPermissions() []FunctionPermission {
	return []FunctionPermission{
		{Code: PermissionKbCreate, Name: "创建知识库", Description: "允许创建新的知识库"},
		{Code: PermissionChatCreate, Name: "创建对话助手", Description: "允许创建新的对话助手"},
		{Code: PermissionAgentCreate, Name: "创建 Agent", Description: "允许创建新的 Agent 应用"},
		{Code: PermissionFileManage, Name: "文件管理", Description: "允许使用文件管理功能"},
	}
}
