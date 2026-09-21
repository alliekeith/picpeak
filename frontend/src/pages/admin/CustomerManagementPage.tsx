/**
 * Admin → Customer accounts management (#354).
 *
 * Mounted at /admin/customers. Listed in AdminSidebar gated on
 * `customers.view` so only super_admin / admin see it.
 *
 * NOT a duplicate of UserManagementPage:
 *   - admin_users table        (admin RBAC, token type 'admin', /admin/login)
 *   - customer_accounts table  (per-event access, token type 'customer', /customer/login)
 *
 * The two pages share visual patterns (tabbed list + invite modal) but
 * operate on completely different DB tables, services, auth surfaces,
 * and permission models. The customer invite intentionally has no role
 * picker (customers don't have roles — access is boolean per event,
 * managed via the event form's CustomerAccountPicker).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, UserCog, Trash2, Search, X, AlertTriangle, CheckCircle2, Clock, MailCheck, Loader2 } from 'lucide-react';
import { InlineCustomerCreate } from '../../components/admin/InlineCustomerCreate';
import { useMutationWithToast } from '../../hooks';
import { useLocalizedDate } from '../../hooks/useLocalizedDate';

import { Loading } from '../../components/common';
import {
  customerAdminService,
  type CustomerAccountSummary,
  type CustomerInvitationSummary,
} from '../../services/customerAdmin.service';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TabType = 'customers' | 'invitations';

export const CustomerManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // formatDate respects the admin-configured `general_date_format`
  // (DD.MM.YYYY by default) instead of the date-fns long-form 'PP'
  // (which always rendered "May 8, 2026" regardless of the setting).
  const { format: fmtDate } = useLocalizedDate();
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try { return fmtDate(new Date(iso)); } catch { return '—'; }
  };
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  // `searchTerm` is the live controlled-input value (keeps the box
  // responsive). `debouncedTerm` lags 250ms behind so the filter +
  // table re-render only fire after the user pauses typing — matches
  // the pattern used in CustomerPicker for the same reason. Filtering
  // is client-side so this doesn't change network shape; the win is
  // on the render side for installs with many rows.
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedTerm(searchTerm), 250);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);
  // Single state drives the unified create/invite modal. Both header
  // buttons open the SAME modal (InlineCustomerCreate) — only the
  // mode-specific action button is rendered inside, so the admin's
  // choice between "create passive" and "invite" is locked in by
  // which trigger they clicked but the form fields stay identical.
  // `null` = closed.
  const [createMode, setCreateMode] = useState<'passive' | 'invite' | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate'; id: number; name: string } | { kind: 'cancelInvite'; id: number; email: string } | null>(null);

  const { data: customers, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => customerAdminService.list(),
  });

  const { data: invitations, isLoading: invitationsLoading, error: invitationsError } = useQuery({
    queryKey: ['admin-customer-invitations'],
    queryFn: () => customerAdminService.listInvitations(),
  });

  const filteredCustomers = useMemo(() => {
    const list = customers || [];
    if (!debouncedTerm.trim()) return list;
    const term = debouncedTerm.trim().toLowerCase();
    return list.filter((c) =>
      c.email.toLowerCase().includes(term)
      || (c.displayName || '').toLowerCase().includes(term)
      || (c.lastName || '').toLowerCase().includes(term)
      || (c.companyName || '').toLowerCase().includes(term)
    );
  }, [customers, debouncedTerm]);

  // #1261 — the "Invite customer" flow is createDirect-then-sendInvite, so a
  // customer whose second call never landed is left looking identical to one
  // the admin deliberately created as passive. Both showed only
  // "Passive — admin only", and there was nothing on this row to tell them
  // apart. Cross-reference the invitations we already fetch (the endpoint
  // returns unaccepted, unexpired ones) so an invited customer says so.
  const pendingInviteByEmail = useMemo(() => {
    const map = new Map<string, CustomerInvitationSummary>();
    for (const i of invitations || []) map.set(i.email.trim().toLowerCase(), i);
    return map;
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    const list = invitations || [];
    if (!debouncedTerm.trim()) return list;
    const term = debouncedTerm.trim().toLowerCase();
    return list.filter((i) => i.email.toLowerCase().includes(term));
  }, [invitations, debouncedTerm]);

  const deactivateMutation = useMutationWithToast({
    mutationFn: (id: number) => customerAdminService.deactivate(id),
    invalidateKeys: [['admin-customers']],
    successMessage: t('customers.deactivate.success', 'Customer deactivated'),
    errorMessage: () => t('customers.deactivate.error', 'Could not deactivate customer'),
  });

  const cancelInviteMutation = useMutationWithToast({
    mutationFn: (id: number) => customerAdminService.cancelInvitation(id),
    invalidateKeys: [['admin-customer-invitations']],
    successMessage: t('customers.cancelInvitation.success', 'Invitation cancelled'),
    errorMessage: () => t('customers.cancelInvitation.error', 'Could not cancel invitation'),
  });

  const renderCustomerName = (c: CustomerAccountSummary) => {
    const display = c.displayName?.trim()
      || [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
      || c.companyName?.trim();
    return display || <span className="text-muted-foreground italic">{t('customers.unnamed', 'Unnamed')}</span>;
  };

  const renderTabs = () => (
    <div className="flex gap-6 border-b border-border mb-6">
      <button
        type="button"
        onClick={() => setActiveTab('customers')}
        className={`pb-3 -mb-px border-b-2 text-sm font-medium ${
          activeTab === 'customers' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('customers.tabs.customers', 'Customers')}
        {customers ? <span className="ml-2 text-xs">({customers.length})</span> : null}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('invitations')}
        className={`pb-3 -mb-px border-b-2 text-sm font-medium ${
          activeTab === 'invitations' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('customers.tabs.invitations', 'Invitations')}
        {invitations ? <span className="ml-2 text-xs">({invitations.length})</span> : null}
      </button>
    </div>
  );

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{t('customers.pageTitle', 'Customers')}</h1>
            {/* Beta badge — Calendar/Quotes/Bills tabs in the customer
                surface are placeholders, so flag the whole feature as
                still evolving. Keeps expectations honest. */}
            <span
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              title="Beta — feature is functional but still evolving"
            >
              {t('navigation.betaTag', 'Beta')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('customers.pageSubtitle', 'Recurring customer accounts that can log in at /customer/login.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setCreateMode('passive')}>
                              <UserCog className="w-4 h-4" />{t('customers.create.openButton', 'Create passive customer')}</Button>
          <Button onClick={() => setCreateMode('invite')}>
                              <UserPlus className="w-4 h-4" />{t('customers.invite.button', 'Invite customer')}</Button>
        </div>
      </div>

      <Card className="py-8"><CardContent className="px-8">{renderTabs()}<div className="mb-4">
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Search className="w-5 h-5 text-muted-foreground" />}</div><Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('customers.search.placeholder', 'Search by email, name, or company')} className="pl-10"
                                  /></div>
                  </div>{activeTab === 'customers' ? (
                    customersLoading ? (
                      <div className="flex justify-center py-8"><Loading /></div>
                    ) : customersError ? (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('customers.loadError', 'Could not load customers')}
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        {t('customers.empty', 'No customers yet. Click "Invite customer" to add one.')}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-3 py-2 font-medium">{t('customers.table.name', 'Name')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.table.email', 'Email')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.table.company', 'Company')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.table.eventCount', 'Events')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.table.lastLogin', 'Last login')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.table.status', 'Status')}</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCustomers.map((c) => (
                              <tr key={c.id} className="border-t border-border">
                                <td className="px-3 py-3">
                                  <Link to={`/admin/clients/accounts/${c.id}`} className="text-foreground hover:underline">
                                    {renderCustomerName(c)}
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">{c.email}</td>
                                <td className="px-3 py-3 text-muted-foreground">{c.companyName || '—'}</td>
                                <td className="px-3 py-3 text-muted-foreground">{c.eventCount ?? 0}</td>
                                <td className="px-3 py-3 text-muted-foreground">{formatDate(c.lastLogin)}</td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-col gap-1">
                                    {c.isActive ? (
                                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--brand)' }}>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {t('customers.status.active', 'Active')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                        <X className="w-3.5 h-3.5" />
                                        {t('customers.status.inactive', 'Deactivated')}
                                      </span>
                                    )}
                                    {/* Passive customers (no portal access). The
                                        status badge sits on its own line so a
                                        passive deactivated customer can still
                                        show both states clearly. */}
                                    {c.isPassive && (() => {
                                      const invite = pendingInviteByEmail.get(c.email.trim().toLowerCase());
                                      return invite ? (
                                        <span
                                          className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                                          // Deliberately describes the invitation ROW, not a
                                          // delivery. createInvitation inserts the row and then
                                          // queues the email without a transaction, so an open
                                          // invitation does not prove an email_queue row exists,
                                          // let alone that anything was delivered.
                                          title={t('customers.invitePending.hint',
                                            'An invitation link for this address is open and has not been accepted. That is not proof the email reached them — check System health if they say it never arrived.') as string}
                                        >
                                          <MailCheck className="w-3 h-3" />
                                          {t('customers.invitePending.badge', 'Invitation pending')}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-sm bg-muted text-foreground">
                                          {t('customers.passive.badge', 'Passive — admin only')}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {c.isActive && (
                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setConfirm({ kind: 'deactivate', id: c.id, name: c.email })}
                                                                      >
                                                                        <Trash2 className="w-4 h-4" />{t('customers.deactivate.button', 'Deactivate')}</Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    invitationsLoading ? (
                      <div className="flex justify-center py-8"><Loading /></div>
                    ) : invitationsError ? (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('customers.loadInvitationsError', 'Could not load invitations')}
                      </div>
                    ) : filteredInvitations.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        {t('customers.invitations.empty', 'No pending invitations.')}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-3 py-2 font-medium">{t('customers.invitations.email', 'Email')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.invitations.invitedBy', 'Invited by')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.invitations.expiresAt', 'Expires')}</th>
                              <th className="px-3 py-2 font-medium">{t('customers.invitations.createdAt', 'Created')}</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvitations.map((inv: CustomerInvitationSummary) => (
                              <tr key={inv.id} className="border-t border-border">
                                <td className="px-3 py-3 text-foreground">{inv.email}</td>
                                <td className="px-3 py-3 text-muted-foreground">{inv.invitedBy || '—'}</td>
                                <td className="px-3 py-3 text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDate(inv.expiresAt)}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                                <td className="px-3 py-3 text-right">
                                  <Button
                                                                  type="button"
                                                                  variant="outline"
                                                                  size="sm"
                                                                  onClick={() => setConfirm({ kind: 'cancelInvite', id: inv.id, email: inv.email })}
                                                                >
                                                                  <X className="w-4 h-4" />{t('customers.invitations.cancel', 'Cancel')}</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}</CardContent></Card>

      {/* Unified create / invite modal. The form is identical in both
          modes — only the bottom action button differs (Save as
          passive vs. Save & send portal invitation). Both flows go
          through InlineCustomerCreate's existing
          createDirect-then-sendInvite path, so the customer row is
          materialised immediately and the "Invitations" tab refreshes
          on success to surface the pending invite in the invite case. */}
      {createMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setCreateMode(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl shadow-lg max-h-[90vh] overflow-y-auto bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <InlineCustomerCreate
                mode={createMode}
                onCancel={() => setCreateMode(null)}
                onCreated={() => {
                  setCreateMode(null);
                  queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
                  queryClient.invalidateQueries({ queryKey: ['admin-customer-invitations'] });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl shadow-lg bg-card">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-500" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {confirm.kind === 'deactivate'
                      ? t('customers.deactivate.title', 'Deactivate customer?')
                      : t('customers.cancelInvitation.title', 'Cancel invitation?')}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {confirm.kind === 'deactivate'
                      ? t('customers.deactivate.body',
                        'They will no longer be able to log in. You can re-invite them later.')
                      : t('customers.cancelInvitation.body',
                        'The invitation link will stop working immediately.')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                                                onClick={() => {
                                                  if (confirm.kind === 'deactivate') {
                                                    deactivateMutation.mutate(confirm.id);
                                                  } else {
                                                    cancelInviteMutation.mutate(confirm.id);
                                                  }
                                                  setConfirm(null);
                                                }} disabled={deactivateMutation.isPending || cancelInviteMutation.isPending}
                                              >
                                                {deactivateMutation.isPending || cancelInviteMutation.isPending && <Loader2 className="animate-spin" />}{t('common.confirm', 'Confirm')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementPage;
