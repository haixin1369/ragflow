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
	"fmt"

	"ragflow/internal/common"
	"ragflow/internal/entity"

	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedFunctionPermissions upserts the built-in function permission catalogue
// into function_permission. Existing rows keep their stored name and
// description only until the built-in definition changes: the upsert rewrites
// both so the catalogue always mirrors the code. Role-to-permission grants
// (role_permission) are never touched.
func SeedFunctionPermissions(ctx context.Context, db *gorm.DB) error {
	if !db.WithContext(ctx).Migrator().HasTable(&entity.FunctionPermission{}) {
		common.Warn("function_permission table missing, skipping function permission seeding")
		return nil
	}
	seeds := entity.BuiltinFunctionPermissions()
	result := db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "description"}),
	}).Create(&seeds)
	if result.Error != nil {
		return fmt.Errorf("failed to seed function permissions: %w", result.Error)
	}
	common.Info("Seeded function permissions", zap.Int("count", len(seeds)))
	return nil
}
