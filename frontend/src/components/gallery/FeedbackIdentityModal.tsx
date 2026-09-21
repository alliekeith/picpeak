import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeedbackIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
  feedbackType: string;
}

export const FeedbackIdentityModal: React.FC<FeedbackIdentityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  feedbackType
}) => {
    const __fieldId = React.useId();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('feedback.nameRequired', 'Name is required');
    }
    if (!email.trim()) {
      newErrors.email = t('feedback.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('feedback.invalidEmail', 'Invalid email address');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(name.trim(), email.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-black/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t('feedback.identityRequired', 'Your Information Required')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('feedback.identityReason', 'Please provide your name and email to submit {{type}}.', { type: feedbackType })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="w-full"><Label className="block"><span className="mb-1.5 block">{t('feedback.yourName', 'Your Name')}</span><Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={t('feedback.namePlaceholder', 'Enter your name')}
                              required aria-invalid={!!(errors.name)} aria-describedby={(errors.name) ? `${__fieldId}-0-error` : undefined}
                            />{(errors.name) && <p id={`${__fieldId}-0-error`} className="mt-1.5 text-sm text-destructive">{errors.name}</p>}</Label></div>
          <div className="w-full"><Label className="block"><span className="mb-1.5 block">{t('feedback.yourEmail', 'Your Email')}</span><Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder={t('feedback.emailPlaceholder', 'Enter your email')}
                              required aria-invalid={!!(errors.email)} aria-describedby={(errors.email) ? `${__fieldId}-1-error` : undefined}
                            />{(errors.email) && <p id={`${__fieldId}-1-error`} className="mt-1.5 text-sm text-destructive">{errors.email}</p>}</Label></div>
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1"
            >
              {t('feedback.submitFeedback', 'Submit Feedback')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};