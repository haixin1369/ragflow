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

// KBFolder is one directory of a knowledge base's document tree. Documents
// classify into folders through document.folder_id; folder_id '' (and
// ParentID '') means the unfiled root.
type KBFolder struct {
	ID   string `gorm:"column:id;primaryKey;size:32" json:"id"`
	KbID string `gorm:"column:kb_id;size:32;not null;index:idx_kb_folder_parent,priority:1;uniqueIndex:uni_kb_folder,priority:1" json:"kb_id"`
	// ParentID is "" for a root folder.
	ParentID string `gorm:"column:parent_id;size:32;not null;default:'';index:idx_kb_folder_parent,priority:2;uniqueIndex:uni_kb_folder,priority:2" json:"parent_id"`
	Name     string `gorm:"column:name;size:128;not null;uniqueIndex:uni_kb_folder,priority:3" json:"name"`
	// Path is the materialized ancestor chain "/<root id>/<child id>/...",
	// including the row itself, used for breadcrumbs and subtree checks.
	Path string `gorm:"column:path;size:1024;not null;default:''" json:"path"`
	BaseModel
}

// TableName returns the table name for the KBFolder model.
func (KBFolder) TableName() string {
	return "kb_folder"
}
