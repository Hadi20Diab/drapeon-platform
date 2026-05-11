import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminUsers, resetAdminUserAccount, updateAdminUserStatus, type AdminUserRow, type PaginatedAdmin } from "../../../lib/api";

function displayName(user: AdminUserRow): string {
  const firstName = user.profile?.firstName ?? "";
  const lastName = user.profile?.lastName ?? "";
  return `${firstName} ${lastName}`.trim() || user.email;
}

export default component$(() => {
  const users = useSignal<PaginatedAdmin<AdminUserRow> | null>(null);
  const search = useSignal("");
  const role = useSignal("");
  const status = useSignal("");
  const page = useSignal(1);
  const error = useSignal("");
  const notice = useSignal("");

  const loadUsers = $(async () => {
    const params = new URLSearchParams();
    if (search.value) params.set("search", search.value);
    if (role.value) params.set("role", role.value);
    if (status.value) params.set("status", status.value);
    params.set("page", String(page.value));
    users.value = await fetchAdminUsers(`?${params.toString()}`);
  });

  useVisibleTask$(async () => {
    try {
      await loadUsers();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load users.";
    }
  });

  const applyFilters = $(async () => {
    error.value = "";
    page.value = 1;
    await loadUsers();
  });

  const changeStatus = $(async (userId: string, nextStatus: string) => {
    error.value = "";
    notice.value = "";
    try {
      await updateAdminUserStatus(userId, nextStatus);
      notice.value = `User moved to ${nextStatus.toLowerCase()}.`;
      await loadUsers();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update user.";
    }
  });

  const resetAccount = $(async (userId: string) => {
    error.value = "";
    notice.value = "";
    try {
      await resetAdminUserAccount(userId);
      notice.value = "Active sessions were revoked for that account.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not reset account.";
    }
  });

  return (
    <AdminShell active="Users" eyebrow="User Management" title="Customer Ledger" subtitle="Search, review, suspend, reset, and monitor customer and admin accounts from one audited workspace.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-ink">{notice.value}</p>}

      <form preventdefault:submit onSubmit$={applyFilters} class="luxury-card grid gap-3 p-4 md:grid-cols-[1fr_160px_160px_auto]">
        <input class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-rose" placeholder="Search email or name" bind:value={search} />
        <select class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-bold" bind:value={role}>
          <option value="">All roles</option>
          <option value="USER">Users</option>
          <option value="DESIGNER">Designers</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-bold" bind:value={status}>
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DELETED">Deleted</option>
        </select>
        <button class="btn-primary" type="submit">Filter</button>
      </form>

      {!users.value && !error.value && <AdminSkeleton />}

      {users.value && (
        <article class="luxury-card overflow-hidden">
          <div class="grid grid-cols-[1.3fr_0.8fr_0.8fr_1fr] border-b border-brand-ink/10 px-5 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45 max-lg:hidden">
            <span>User</span><span>Role</span><span>Activity</span><span class="text-right">Actions</span>
          </div>
          {users.value.items.map((user) => (
            <div key={user.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-5 last:border-0 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr] lg:items-center">
              <div>
                <p class="font-semibold text-brand-ink">{displayName(user)}</p>
                <p class="mt-1 text-sm text-brand-ink/50">{user.email}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="border border-brand-ink/10 bg-brand-sand px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-ink">{user.role}</span>
                <span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(user.status)}`}>{user.status}</span>
              </div>
              <p class="text-sm text-brand-ink/55">{user._count?.bookings ?? 0} fittings - {user._count?.aiSessions ?? 0} AI sessions</p>
              <div class="flex flex-wrap justify-start gap-2 lg:justify-end">
                <button type="button" class="border border-brand-ink/15 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em]" onClick$={() => changeStatus(user.id, "ACTIVE")}>Activate</button>
                <button type="button" class="border border-brand-rose/25 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em] text-brand-rose" onClick$={() => changeStatus(user.id, "SUSPENDED")}>Suspend</button>
                <button type="button" class="border border-brand-ink/15 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em]" onClick$={() => resetAccount(user.id)}>Reset</button>
              </div>
            </div>
          ))}
          {users.value.items.length === 0 && <AdminEmptyState title="No users found" body="Try changing the search or status filter." />}
          <div class="flex items-center justify-between border-t border-brand-ink/10 px-5 py-4 text-sm font-semibold text-brand-ink/55">
            <span>{users.value.pagination.total} total accounts</span>
            <span>Page {users.value.pagination.page}</span>
          </div>
        </article>
      )}
    </AdminShell>
  );
});
