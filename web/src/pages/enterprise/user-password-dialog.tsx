/*
 *  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UserPasswordDialogProps {
  loading: boolean;
  hideModal: () => void;
  onOk: (password: string) => void;
}

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

export function UserPasswordDialog({
  loading,
  hideModal,
  onOk,
}: UserPasswordDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        hideModal();
      }
    },
    [hideModal],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
    },
    [],
  );

  const passwordMismatch =
    confirmPassword !== '' && password !== confirmPassword;

  const formComplete = password !== '' && confirmPassword === password;

  const handleOk = useCallback(() => {
    if (!formComplete) {
      return;
    }
    onOk(password);
  }, [formComplete, password, onOk]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate">
            {t('enterprise.changePassword')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-new-password">
              {t('enterprise.newPassword')} <RequiredMark />
            </Label>
            <Input
              id="user-new-password"
              type="password"
              autoFocus
              value={password}
              placeholder={t('enterprise.passwordPlaceholder')}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-confirm-password">
              {t('enterprise.confirmPassword')} <RequiredMark />
            </Label>
            <Input
              id="user-confirm-password"
              type="password"
              value={confirmPassword}
              placeholder={t('enterprise.passwordPlaceholder')}
              onChange={handleConfirmPasswordChange}
            />
            {passwordMismatch && (
              <span className="text-xs text-red-500">
                {t('enterprise.passwordMismatch')}
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('common.cancel')}
          </Button>
          <Button loading={loading} disabled={!formComplete} onClick={handleOk}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
