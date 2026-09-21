/**
 * Admin → Contracts → Templates (#1445). Every template, archived ones
 * included: create, duplicate, make default, archive and restore. A template
 * is edited on its own page; the standard template is copied, not edited.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { Loading } from '../../../components/common';
import { PermissionGate } from '../../../components/admin/PermissionGate';
import {
  contractTemplatesService, templateError, type ContractTemplateSummary,
} from '../../../services/contractTemplates.service';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const badgeClass = 'text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm';

export const ContractTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => contractTemplatesService.list(),
  });
  const templates = data?.templates || [];

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success(done);
    } catch (err) {
      toast.error(templateError(err).message || t('contracts.templates.actionFailed', 'That didn\'t work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const created = await contractTemplatesService.create({ name: newName.trim() });
      await queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      navigate(`/admin/clients/contracts/templates/${created.template.id}`);
    } catch (err) {
      toast.error(templateError(err).message || t('contracts.templates.actionFailed', 'That didn\'t work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const duplicate = (tpl: ContractTemplateSummary) => run(
    async () => {
      const copy = await contractTemplatesService.duplicate(tpl.id,
        t('contracts.templates.copyName', '{{name}} (copy)', { name: tpl.name }) as string);
      navigate(`/admin/clients/contracts/templates/${copy.template.id}`);
    },
    t('contracts.templates.duplicated', 'Template duplicated') as string,
  );

  const statusLabel = (tpl: ContractTemplateSummary) => {
    if (tpl.status === 'archived') return t('contracts.templates.status.archived', 'Archived');
    if (tpl.currentVersion) return t('contracts.templates.status.published', 'Published · v{{version}}', { version: tpl.currentVersion });
    return t('contracts.templates.status.draft', 'Draft');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/clients/contracts" className="p-1 rounded-sm hover:bg-accent"
          aria-label={t('contracts.templates.back', 'Back to contracts') as string}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex-1 text-foreground">
          {t('contracts.templates.title', 'Contract templates')}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-3xl">
        {t('contracts.templates.intro', 'A template sets the clauses a new contract starts with, their order and their wording. Publishing freezes a version; a contract keeps the version it was made from.')}
      </p>

      <PermissionGate permission="contracts.templates.manage">
        <Card><CardContent><form onSubmit={create} className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[220px]">
                            <div className="w-full"><Label className="block"><span className="mb-1.5 block">{t('contracts.templates.newName', 'New template name') as string}</span><Input id="new-contract-template-name"
                                                    value={newName} maxLength={128} onChange={(e) => setNewName(e.target.value)} /></Label></div>
                          </div>
                          <Button type="submit" disabled={busy || !newName.trim()}>
                            <Plus className="w-4 h-4 mr-1" />{t('contracts.templates.create', 'Create template')}
                          </Button>
                        </form></CardContent></Card>
      </PermissionGate>

      {isLoading ? <Loading /> : (
        <Card><CardContent>{templates.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('contracts.templates.empty', 'No templates yet.')}</p>
                        ) : (
                          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {templates.map((tpl) => (
                              <li key={tpl.id} className={`py-3 flex flex-wrap items-center gap-3 ${tpl.status === 'archived' ? 'opacity-60' : ''}`}>
                                <div className="flex-1 min-w-[200px]">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link to={`/admin/clients/contracts/templates/${tpl.id}`}
                                      className="font-medium text-foreground hover:underline">
                                      {tpl.name}
                                    </Link>
                                    {tpl.isSystem && (
                                      <span className={`${badgeClass} bg-muted text-foreground`}>
                                        {t('contracts.templates.standard', 'Standard')}
                                      </span>
                                    )}
                                    {tpl.isDefault && (
                                      <span className={`${badgeClass} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`}>
                                        {t('contracts.templates.default', 'Default')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {statusLabel(tpl)}
                                    {tpl.hasDraft && tpl.currentVersion ? ` · ${t('contracts.templates.unpublished', 'Unpublished changes')}` : ''}
                                    {tpl.description ? ` · ${tpl.description}` : ''}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Link to={`/admin/clients/contracts/templates/${tpl.id}`}>
                                    <Button variant="outline" size="sm">{t('contracts.templates.open', 'Open')}</Button>
                                  </Link>
                                  <PermissionGate permission="contracts.templates.manage">
                                    <Button variant="outline" size="sm" disabled={busy} onClick={() => duplicate(tpl)}>
                                      {t('contracts.templates.duplicate', 'Duplicate')}
                                    </Button>
                                    {tpl.currentVersion && !tpl.isDefault && tpl.status !== 'archived' && (
                                      <Button variant="outline" size="sm" disabled={busy}
                                        onClick={() => run(() => contractTemplatesService.setDefault(tpl.id),
                                          t('contracts.templates.defaultSet', 'New contracts now start from this template') as string)}>
                                        {t('contracts.templates.makeDefault', 'Make default')}
                                      </Button>
                                    )}
                                    {tpl.status === 'archived' ? (
                                      <Button variant="outline" size="sm" disabled={busy}
                                        onClick={() => run(() => contractTemplatesService.restore(tpl.id),
                                          t('contracts.templates.restored', 'Template restored') as string)}>
                                        {t('contracts.templates.restore', 'Restore')}
                                      </Button>
                                    ) : !tpl.isDefault && (
                                      <Button variant="outline" size="sm" disabled={busy}
                                        onClick={() => run(() => contractTemplatesService.archive(tpl.id),
                                          t('contracts.templates.archivedToast', 'Template archived') as string)}>
                                        {t('contracts.templates.archive', 'Archive')}
                                      </Button>
                                    )}
                                  </PermissionGate>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}</CardContent></Card>
      )}
    </div>
  );
};
