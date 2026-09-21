import React, { useState } from 'react';
import {
  HardDrive,
  Settings,
  History,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  ShieldCheck,
  FolderTree,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Loading } from '../../components/common';
import { useLocalizedDate } from '../../hooks/useLocalizedDate';
import { useMutationWithToast } from '../../hooks';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { BackupDashboard } from '../../components/admin/BackupDashboard';
import { BackupConfiguration } from '../../components/admin/BackupConfiguration';
import { BackupHistory } from '../../components/admin/BackupHistory';
import { RestoreWizard } from '../../components/admin/RestoreWizard';
import { PicpeakExportCard } from '../../components/admin/PicpeakBackupCard';
import { BackupIntegrityCard } from '../../components/admin/BackupIntegrityCard';
import { BackupCoverageCard } from '../../components/admin/BackupCoverageCard';
import { api } from '../../config/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TabId = 'dashboard' | 'configuration' | 'history' | 'restore' | 'integrity' | 'coverage';

export const BackupManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { t } = useTranslation();
  // Full-instance export contains every secret, so the endpoint is
  // super_admin-only (GHSA-pv6w) — hide the card for other roles instead
  // of showing a button that always 403s. The backup destination and
  // restores are super_admin-only too.
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role?.name === 'super_admin';
  const { formatDateTime: fmtDateTime } = useLocalizedDate();

  const tabs = [
    { id: 'dashboard' as const, label: t('backup.tabs.dashboard'), icon: HardDrive },
    { id: 'configuration' as const, label: t('backup.tabs.configuration'), icon: Settings },
    { id: 'history' as const, label: t('backup.tabs.history'), icon: History },
    { id: 'restore' as const, label: t('backup.tabs.restore'), icon: RefreshCw },
    { id: 'integrity' as const, label: t('backup.tabs.integrity', 'Integrity'), icon: ShieldCheck },
    { id: 'coverage' as const, label: t('backup.tabs.coverage', 'Coverage'), icon: FolderTree },
  ];

  const { data: backupStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const response = await api.get('/admin/backup/status');
      return response.data;
    },
    refetchInterval: 10000,
  });

  const { data: backupConfig, isLoading: configLoading } = useQuery({
    queryKey: ['backup-config'],
    queryFn: async () => {
      const response = await api.get('/admin/backup/config');
      return response.data;
    },
  });

  const manualBackupMutation = useMutationWithToast({
    mutationFn: async () => {
      const response = await api.post('/admin/backup/run');
      return response.data;
    },
    successMessage: t('backup.messages.backupStarted'),
    errorMessage: t('backup.messages.backupFailed'),
    invalidateKeys: [['backup-status']],
  });

  const updateConfigMutation = useMutationWithToast({
    mutationFn: async (config: unknown) => {
      const response = await api.put('/admin/backup/config', config);
      return response.data;
    },
    successMessage: t('backup.messages.configUpdated'),
    errorMessage: t('backup.messages.configUpdateFailed'),
    invalidateKeys: [['backup-config']],
  });

  if (statusLoading || configLoading) {
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('backup.title')}</h1>
        <p className="text-muted-foreground">
          {t('backup.subtitle')}
        </p>
      </div>

      {/* Status Bar */}
      <Card className="mb-6 p-4"><CardContent><div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        {backupStatus?.isRunning ? (
                          <>
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{t('backup.status.inProgress')}</span>
                          </>
                        ) : backupStatus?.lastBackup ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-foreground">
                              {t('backup.status.lastBackup')}: {fmtDateTime(backupStatus.lastBackup.created_at)}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-foreground">{t('backup.status.noBackups')}</span>
                          </>
                        )}
                      </div>

                      {backupConfig?.backup_enabled && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {t('backup.status.nextBackup')}: {backupStatus?.nextBackup ? fmtDateTime(backupStatus.nextBackup) : t('backup.status.notScheduled')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => manualBackupMutation.mutate()}
                        disabled={backupStatus?.isRunning || manualBackupMutation.isPending}
                        variant="secondary"
                        size="sm"
                      >
                        {manualBackupMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('backup.actions.starting')}
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            {t('backup.actions.runBackupNow')}
                          </>
                        )}
                      </Button>

                      <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                        backupConfig?.backup_enabled
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-muted text-foreground'
                      }`}>
                        <Shield className="h-4 w-4" />
                        <span>{backupConfig?.backup_enabled ? t('backup.status.enabled') : t('backup.status.disabled')}</span>
                      </div>
                    </div>
                  </div></CardContent></Card>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <BackupDashboard
              status={backupStatus}
              config={backupConfig}
              onRunBackup={() => manualBackupMutation.mutate()}
              isBackupRunning={backupStatus?.isRunning || manualBackupMutation.isPending}
            />
            {isSuperAdmin && <PicpeakExportCard />}
          </div>
        )}

        {activeTab === 'configuration' && (
          <BackupConfiguration
            config={backupConfig}
            onSave={(newConfig: unknown) => updateConfigMutation.mutate(newConfig)}
            isSaving={updateConfigMutation.isPending}
            canManageDestination={isSuperAdmin}
          />
        )}

        {activeTab === 'history' && (
          <BackupHistory />
        )}

        {activeTab === 'restore' && (isSuperAdmin ? (
          <RestoreWizard onVerifyIntegrity={() => setActiveTab('integrity')} />
        ) : (
          <Card className="p-6"><CardContent><p className="text-sm text-foreground">
                                    {t('backup.restore.superAdminOnly', 'Restoring a backup replaces all data on this instance, user accounts and roles included, so only a Super Admin can do it.')}
                                  </p></CardContent></Card>
        ))}

        {activeTab === 'integrity' && (
          <BackupIntegrityCard />
        )}

        {activeTab === 'coverage' && (
          <BackupCoverageCard />
        )}
      </div>
    </div>
  );
};
