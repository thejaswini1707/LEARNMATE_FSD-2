import { useCallback, useMemo, useState } from "react";
import { LuPencil, LuSearch, LuTrash2, LuUsers } from "react-icons/lu";
import { ROLES, YEARS } from "../config";
import { KEYS, adminDeleteUser, adminUpdateUser, listUsers } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../utils/format";
import UserLink from "../components/UserLink";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import DataTable from "../components/ui/DataTable";
import { EmptyState, ErrorState, ListSkeleton } from "../components/ui/Feedback";
import { Input, Select } from "../components/ui/Field";
import Modal, { ConfirmDialog } from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";

const ROLE_TONE = { Admin: "danger", Tutor: "primary", Student: "" };

function EditUserModal({ target, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: target.name, department: target.department || "", year: target.year || "", role: target.role });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const years = form.year && !YEARS.includes(form.year) ? [form.year, ...YEARS] : YEARS;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name can't be empty."); return; }
    setSaving(true);
    try { await adminUpdateUser(target.id, form); toast.success("User updated."); onClose(); }
    catch (err) { toast.error(err.message); setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Edit user" description={target.email}
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="edit-user" loading={saving}>Save changes</Button></>}>
      <form id="edit-user" className="stack" onSubmit={submit} noValidate>
        <Input label="Full name" value={form.name} error={error} onChange={(e) => { setError(""); setForm((f) => ({ ...f, name: e.target.value })); }} required />
        <Input label="Department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
        <Select label="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
          <option value="">Not set</option>{years.map((y) => <option key={y}>{y}</option>)}
        </Select>
        <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          {Object.values(ROLES).map((r) => <option key={r}>{r}</option>)}
        </Select>
      </form>
    </Modal>
  );
}

function Students() {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => listUsers(), []);
  const { data, error, loading, reload } = useAsync(load, [KEYS.users]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data || []).filter((u) => (!role || u.role === role) && (!term || [u.name, u.email, u.department].some((v) => (v || "").toLowerCase().includes(term))));
  }, [data, q, role]);

  const confirmDelete = async () => {
    setBusy(true);
    try { await adminDeleteUser(removing.id, user.email); toast.success("User deleted."); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); setRemoving(null); }
  };

  const columns = [
    { key: "name", header: "Name", sortValue: (u) => u.name, render: (u) => (
      <UserLink id={u.id} name={u.name} avatar={u.avatar} size={34} subtitle={u.email} className="cell-user" />
    ) },
    { key: "role", header: "Role", sortValue: (u) => u.role, render: (u) => <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge> },
    { key: "department", header: "Department", sortValue: (u) => u.department || "", render: (u) => u.department || "–" },
    { key: "year", header: "Year", render: (u) => u.year || "–" },
    { key: "joined", header: "Joined", sortValue: (u) => u.createdAt || 0, render: (u) => (u.createdAt ? formatDate(u.createdAt) : "–") },
    { key: "actions", header: "", render: (u) => (
      <div className="row-actions">
        <Button size="sm" variant="secondary" icon={LuPencil} onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}>Edit</Button>
        <Button size="sm" variant="danger-ghost" icon={LuTrash2} disabled={u.email === user.email} title={u.email === user.email ? "You can't delete your own account" : undefined} onClick={() => setRemoving(u)} aria-label={`Delete ${u.name}`}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Users" }]}
        title="Users"
        description="Everyone registered on LearnMate. Open a profile, edit details or remove accounts."
        meta={data ? [{ label: "students", value: data.filter((u) => u.role === ROLES.STUDENT).length }, { label: "tutors", value: data.filter((u) => u.role === ROLES.TUTOR).length }] : undefined}
      />
      <div className="card">
        <div className="toolbar toolbar--compact">
          <div className="input-wrap">
            <LuSearch size={16} aria-hidden="true" />
            <input type="search" className="control" placeholder="Search users" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {Object.values(ROLES).map((r) => <option key={r}>{r}</option>)}
          </Select>
        </div>
        {loading ? <div className="card__body"><ListSkeleton rows={5} /></div> : error && !data ? <div className="card__body"><ErrorState onRetry={reload} /></div> : (
          <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} initialSort={{ key: "joined", dir: "desc" }}
            empty={<div className="card__body"><EmptyState icon={LuUsers} title={data.length ? "No users match your search" : "No users yet"} message={data.length ? "Try a different name or role." : "Accounts will appear here as people register."} /></div>} />
        )}
      </div>
      {editing && <EditUserModal key={editing.id} target={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!removing} loading={busy} title="Delete this user?" message={removing ? `${removing.name} (${removing.email}) will lose access to LearnMate. This can't be undone.` : ""}
        confirmLabel="Delete user" onCancel={() => setRemoving(null)} onConfirm={confirmDelete} />
    </>
  );
}

export default Students;
