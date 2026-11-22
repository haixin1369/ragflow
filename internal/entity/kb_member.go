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

// KBMember grants one user a permission level on one knowledge base. Owners
// and the superuser never appear in this table: ownership lives on
// knowledgebase.user_id and the superuser bypasses resource checks.
type KBMember struct {
	ID   string `gorm:"column:id;primaryKey;size:32" json:"id"`
	KbID string `gorm:"column:kb_id;size:32;not null;uniqueIndex:uni_kb_member,priority:1" json:"kb_id"`
	// UserID is the granted user. One user holds at most one row per knowledge
	// base; changing the level is an update, never a second row.
	UserID     string `gorm:"column:user_id;size:32;not null;uniqueIndex:uni_kb_member,priority:2;index:idx_kb_member_user" json:"user_id"`
	Permission string `gorm:"column:permission;size:8;not null" json:"permission"` // view | edit
	BaseModel
}

// KB member permission levels, ordered owner > edit > view > none.
const (
	KBMemberPermissionView = "view"
	KBMemberPermissionEdit = "edit"
)

// TableName returns the table name for the KBMember model.
func (KBMember) TableName() string {
	return "kb_member"
}
