import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../services/admin.service';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changePasswordMutation = useMutation({
    mutationFn: adminService.changePassword,
    onSuccess: () => {
      toast.success(t('passwordChange.success'));
      // Full page reload so the browser picks up the new JWT cookie.
      // Same fix as MandatoryPasswordChangeModal — without this, the old
      // token gets rejected and causes a redirect loop.
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 2000);
    },
    onError: (error: any) => {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error(t('passwordChange.failed'));
      }
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = t('passwordChange.currentRequired');
    }

    if (!formData.newPassword) {
      newErrors.newPassword = t('passwordChange.newRequired');
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('passwordChange.minLengthError');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordChange.confirmRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordChange.noMatch');
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = t('passwordChange.mustBeDifferent');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md"><CardContent><div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">{t('passwordChange.title')}</h2>
                      <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Current Password */}
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-1">
                          {t('passwordChange.currentPassword')}
                        </label>
                        <div className="relative">
                          <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Lock className="w-5 h-5 text-muted-foreground" />}</div><Input
                                                      id="currentPassword"
                                                      type={showPasswords.current ? 'text' : 'password'}
                                                      value={formData.currentPassword}
                                                      onChange={handleInputChange('currentPassword')}
                                                      placeholder={t('passwordChange.currentPasswordPlaceholder')} className="pl-10" aria-invalid={!!(errors.currentPassword)} aria-describedby={(errors.currentPassword) ? "currentPassword-error" : undefined}
                                                    /></div>{(errors.currentPassword) && <p id={"currentPassword-error"} className="mt-1.5 text-sm text-destructive">{errors.currentPassword}</p>}</div>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-2 p-1 hover:bg-accent rounded-sm"
                          >
                            {showPasswords.current ? 
                              <EyeOff className="w-4 h-4 text-muted-foreground" /> : 
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1">
                          {t('passwordChange.newPassword')}
                        </label>
                        <div className="relative">
                          <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Lock className="w-5 h-5 text-muted-foreground" />}</div><Input
                                                      id="newPassword"
                                                      type={showPasswords.new ? 'text' : 'password'}
                                                      value={formData.newPassword}
                                                      onChange={handleInputChange('newPassword')}
                                                      placeholder={t('passwordChange.newPasswordPlaceholder')} className="pl-10" aria-invalid={!!(errors.newPassword)} aria-describedby={(errors.newPassword) ? "newPassword-error" : undefined}
                                                    /></div>{(errors.newPassword) && <p id={"newPassword-error"} className="mt-1.5 text-sm text-destructive">{errors.newPassword}</p>}</div>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-2 p-1 hover:bg-accent rounded-sm"
                          >
                            {showPasswords.new ? 
                              <EyeOff className="w-4 h-4 text-muted-foreground" /> : 
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                          {t('passwordChange.confirmPassword')}
                        </label>
                        <div className="relative">
                          <div className="w-full"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Lock className="w-5 h-5 text-muted-foreground" />}</div><Input
                                                      id="confirmPassword"
                                                      type={showPasswords.confirm ? 'text' : 'password'}
                                                      value={formData.confirmPassword}
                                                      onChange={handleInputChange('confirmPassword')}
                                                      placeholder={t('passwordChange.confirmPasswordPlaceholder')} className="pl-10" aria-invalid={!!(errors.confirmPassword)} aria-describedby={(errors.confirmPassword) ? "confirmPassword-error" : undefined}
                                                    /></div>{(errors.confirmPassword) && <p id={"confirmPassword-error"} className="mt-1.5 text-sm text-destructive">{errors.confirmPassword}</p>}</div>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-2 p-1 hover:bg-accent rounded-sm"
                          >
                            {showPasswords.confirm ? 
                              <EyeOff className="w-4 h-4 text-muted-foreground" /> : 
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* Password Requirements */}
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-medium">{t('passwordChange.requirements')}</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>{t('passwordChange.minLength')}</li>
                              <li>{t('passwordChange.mustDiffer')}</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                        >
                          {t('passwordChange.cancel')}
                        </Button>
                        <Button
                                                    type="submit" disabled={changePasswordMutation.isPending}
                                                  >
                                                    {changePasswordMutation.isPending && <Loader2 className="animate-spin" />}{t('passwordChange.title')}</Button>
                      </div>
                    </form>
                  </div></CardContent></Card>
    </div>
  );
};