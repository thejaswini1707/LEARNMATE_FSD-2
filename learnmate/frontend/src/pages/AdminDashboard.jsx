import { useCallback, useState } from "react";
import { LuBookOpen, LuCalendarCheck, LuCalendarX, LuCircleCheck, LuClock, LuGraduationCap, LuShield, LuStar, LuTrash2, LuUsers } from "react-icons/lu";
import { KEYS, deleteBooking } from "../services/api";
import { getAdminOverview } from "../services/dashboardAPI";
import { useAsync } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { formatDate, formatDateTime, formatSession } from "../utils/format";
import { StatCard } from "../components/DashboardCards";
import UserLink, { ActorText } from "../components/UserLink";
import Button from "../components/ui/Button";
import DataTable from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/Badge";
import { CardSkeletons, EmptyState, ErrorState } from "../components/ui/Feedback";
import { ConfirmDialog } from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";

const ICONS = { user: LuUsers, booking: LuCalendarCheck, material: LuBookOpen, review: LuStar };

function AdminDashboard() {
  const toast = useToast();
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => getAdminOverview(), []);
  const { data, error, loading, reload } = useAsync(load, [KEYS.users, KEYS.bookings, KEYS.reviews, KEYS.materialsVersion]);

  const confirmDelete = async () => {
    setBusy(true);
    try { await deleteBooking(removing.id); toast.success("Session deleted."); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); setRemoving(null); }
  };

  const header = (
    <PageHeader
      variant="hero"
      eyebrow="Administration"
      title="Platform overview"
      description="A live view of people, sessions, materials and reviews across LearnMate."
      meta={data ? [{ label: "awaiting a tutor response", value: data.pending }, { label: "sessions in total", value: data.sessions }] : undefined}
      actions={<><Button to="/students" variant="light" icon={LuUsers}>Manage users</Button><Button to="/reviews" variant="hero-outline">Moderate reviews</Button></>}
    />
  );
  if (loading) return <>{header}<CardSkeletons count={4} height={110} /></>;
  if (error && !data) return <>{header}<ErrorState onRetry={reload} /></>;

  const columns = [
    { key: "student", header: "Student", sortValue: (b) => b.studentName || "", render: (b) => <UserLink id={b.studentId} name={b.studentName || "–"} /> },
    { key: "tutor", header: "Tutor", sortValue: (b) => b.tutor, render: (b) => <UserLink id={b.tutorId} name={b.tutor} /> },
    { key: "subject", header: "Subject", sortValue: (b) => b.subject, render: (b) => b.subject },
    { key: "when", header: "When", sortValue: (b) => b.startsAt, render: (b) => formatSession(b.startsAt) },
    { key: "status", header: "Status", sortValue: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
    { key: "actions", header: "", render: (b) => <div className="row-actions"><Button size="sm" variant="danger-ghost" iconOnly icon={LuTrash2} aria-label={`Delete ${b.subject} session`} title="Delete session" onClick={() => setRemoving(b)} /></div> },
  ];

  return (
    <>
      {header}
      <div className="stat-grid stat-grid--six">
        <StatCard icon={LuUsers} value={data.students} label="Students" />
        <StatCard icon={LuGraduationCap} value={data.tutors} label="Tutors" />
        <StatCard icon={LuCalendarCheck} value={data.sessions} label="Sessions booked" tone="accent" />
        <StatCard icon={LuClock} value={data.pending} label="Awaiting tutor response" />
        <StatCard icon={LuBookOpen} value={data.materials} label="Study materials" tone="success" />
        <StatCard icon={LuStar} value={data.reviews} label="Reviews" />
      </div>

      <div className="dash-grid">
        <section className="card" aria-labelledby="sessions-heading">
          <div className="card__header"><h2 id="sessions-heading">All sessions</h2></div>
          <DataTable columns={columns} rows={data.bookings} rowKey={(b) => b.id} pageSize={6} initialSort={{ key: "when", dir: "desc" }}
            empty={<div className="card__body"><EmptyState compact icon={LuCalendarX} title="No sessions yet" message="Booked sessions will be listed here." /></div>} />
        </section>

        <div className="stack stack--lg">
          <section className="card" aria-labelledby="act-heading">
            <div className="card__header"><h2 id="act-heading">Recent activity</h2></div>
            <div className="card__body">
              {data.activity.length ? (
                <ul className="list">
                  {data.activity.map((a) => {
                    const Icon = ICONS[a.kind] || LuCircleCheck;
                    return <li className="list__item" key={a.id}><span className="list__dot"><Icon size={16} aria-hidden="true" /></span><div><div className="list__text"><ActorText text={a.text} people={a.people} /></div><div className="list__meta">{formatDateTime(a.ts)}</div></div></li>;
                  })}
                </ul>
              ) : <EmptyState compact title="No activity yet" message="New sign-ups, bookings, uploads and reviews show up here." />}
            </div>
          </section>
          <section className="card" aria-labelledby="moderate-heading">
            <div className="card__header"><h2 id="moderate-heading">Moderation</h2></div>
            <div className="card__body quick-actions">
              <Button to="/students" variant="secondary" icon={LuShield} block>Manage users</Button>
              <Button to="/materials" variant="secondary" icon={LuBookOpen} block>Review materials</Button>
              <Button to="/reviews" variant="secondary" icon={LuStar} block>Moderate reviews</Button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog open={!!removing} loading={busy} title="Delete this session?" message={removing ? `The ${removing.subject} session between ${removing.studentName || "the student"} and ${removing.tutor} (${formatDate(removing.startsAt)}) will be removed for both people.` : ""}
        confirmLabel="Delete session" onCancel={() => setRemoving(null)} onConfirm={confirmDelete} />
    </>
  );
}

export default AdminDashboard;
