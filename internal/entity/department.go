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

// Department is one node of the company/department tree. A user belongs to
// exactly one department; a knowledge base belongs to the department of its
// owner, resolved by joining user at query time (no denormalized column).
type Department struct {
	ID   string `gorm:"column:id;primaryKey;size:32" json:"id"`
	Name string `gorm:"column:name;size:64;not null" json:"name"`
	// ParentID is "" for a root department.
	ParentID string `gorm:"column:parent_id;size:32;not null;default:'';index:idx_department_parent" json:"parent_id"`
	// Path is the materialized ancestor chain "/<root id>/<child id>/...",
	// including the row itself, used for subtree filters.
	Path string `gorm:"column:path;size:512;not null;default:''" json:"path"`
	BaseModel
}

// TableName returns the table name for the Department model.
func (Department) TableName() string {
	return "department"
}
