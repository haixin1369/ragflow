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

package common

import (
	"encoding/base64"
	"testing"
)

func TestUnwrapPasswordPlaintext(t *testing.T) {
	b64 := func(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"frontend payload: base64-wrapped ascii password", b64("admin"), "admin"},
		{"frontend payload: base64-wrapped utf-8 password", b64("管理员123"), "管理员123"},
		{"plain password not valid base64 (bad length)", "admin", "admin"},
		{"plain password not valid base64 (bad alphabet)", "adm!n=", "adm!n="},
		{"plain password valid base64 but decoded not utf-8", "test", "test"},
		{"plain password valid base64 but decoded not utf-8 (digits)", "123456", "123456"},
		{"empty input", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := unwrapPasswordPlaintext(tt.input); got != tt.want {
				t.Errorf("unwrapPasswordPlaintext(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
