import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LuInbox, LuUsers } from "react-icons/lu";
import { MODES, ROLES, STATUS, SUBJECTS } from "../config";
import { KEYS, createBooking, listMyBookings, listTutors, updateBookingStatus } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { parseSkills, todayISO } from "../utils/format";
import SessionCard from "../components/SessionCard";
import UserLink from "../components/UserLink";
import Button from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { CardSkeletons, EmptyState, ErrorState } from "../components/ui/Feedback";
import { Input, Select, Textarea } from "../components/ui/Field";
import PageHeader from "../components/ui/PageHeader";
import { RatingSummary } from "../components/ui/Stars";

const ACTIVE = [STATUS.PENDING, STATUS.CONFIRMED];

function BookingForm({ tutors, initial, onBooked }) {
  const { user } = useAuth();
  const toast = useToast();
  const [today] = useState(todayISO);
  const [form, setForm] = useState({ tutorEmail: initial.tutorEmail, subject: initial.subject, date: "", time: "", mode: "Online", topic: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const tutor = tutors.find((t) => t.email === form.tutorEmail);
  const tutorSkills = tutor ? parseSkills(tutor.skills) : [];
  const subjects = tutorSkills.length ? tutorSkills : SUBJECTS;

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value, ...(name === "tutorEmail" ? { subject: "" } : {}) }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = {};
    if (!form.tutorEmail) found.tutorEmail = "Choose a tutor.";
    if (!form.subject) found.subject = "Choose a subject.";
    if (!form.date) found.date = "Pick a date.";
    if (!form.time) found.time = "Pick a start time.";
    if (!form.topic.trim()) found.topic = "Tell the tutor what you'd like help with.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await createBooking(user, form);
      toast.success("Session requested. You'll be notified when the tutor responds.");
      onBooked();
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="booking-layout">
      <form className="card card__body stack stack--lg" onSubmit={submit} noValidate>
        <h2>Session details</h2>
        {formError && <div className="alert alert--error" role="alert">{formError}</div>}
        <div className="form-grid">
          <Select label="Tutor" name="tutorEmail" value={form.tutorEmail} onChange={change} error={errors.tutorEmail} required>
            <option value="">Choose a tutor</option>
            {tutors.map((t) => <option key={t.id} value={t.email}>{t.name}</option>)}
          </Select>
          <Select label="Subject" name="subject" value={form.subject} onChange={change} error={errors.subject} required>
            <option value="">Choose a subject</option>
            {form.subject && !subjects.includes(form.subject) && <option>{form.subject}</option>}
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Input label="Date" name="date" type="date" min={today} value={form.date} onChange={change} error={errors.date} required />
          <Input label="Start time" name="time" type="time" value={form.time} onChange={change} error={errors.time} required />
          <div className="span-2">
            <Select label="Session mode" name="mode" value={form.mode} onChange={change}>
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </div>
          <div className="span-2">
            <Textarea label="What do you need help with?" name="topic" rows={4} placeholder="For example: understanding inheritance and interfaces in Java" value={form.topic} onChange={change} error={errors.topic} required />
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" size="lg" loading={loading}>{loading ? "Sending request…" : "Request session"}</Button>
        </div>
      </form>

      <aside className="stack stack--lg">
        <section className="card card__body stack">
          <h2>{tutor ? "About this tutor" : "Choose a tutor"}</h2>
          {tutor ? (
            <>
              <UserLink id={tutor.id} name={tutor.name} avatar={tutor.avatar} size={44} subtitle={[tutor.level, tutor.mode].filter(Boolean).join(" · ") || "Peer tutor"} className="cell-user" />
              <RatingSummary rating={tutor.rating} count={tutor.reviewCount} />
              <div className="chips">{tutorSkills.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
              <p><strong>Availability:</strong> {tutor.availability || "Not specified. Suggest a time and confirm in chat."}</p>
            </>
          ) : <p>Select a tutor to see their skills and availability.</p>}
        </section>
        <section className="card card__body">
          <h3 style={{ marginBottom: 10 }}>What happens next</h3>
          <ol className="mini-steps">
            <li>Your request is sent to the tutor.</li>
            <li>The tutor accepts or declines it.</li>
            <li>After the session, the tutor marks it completed and you can leave a review.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}

function SessionList({ items, perspective, busyId, onAction, emptyTitle, emptyMessage }) {
  const now = useState(() => Date.now())[0];
  const groups = useMemo(() => {
    const upcoming = items.filter((b) => ACTIVE.includes(b.status) && b.startsAt >= now).sort((a, b) => a.startsAt - b.startsAt);
    const pending = perspective === "tutor" ? upcoming.filter((b) => b.status === STATUS.PENDING) : [];
    const past = items.filter((b) => !upcoming.includes(b)).sort((a, b) => b.startsAt - a.startsAt);
    return { pending, upcoming: upcoming.filter((b) => !pending.includes(b)), past };
  }, [items, now, perspective]);

  if (!items.length) return <EmptyState icon={LuInbox} title={emptyTitle} message={emptyMessage} action={perspective === "student" ? <Button to="/search">Find a tutor</Button> : null} />;

  const section = (title, list) => list.length > 0 && (
    <section className="stack" aria-label={title}>
      <h2 className="mini-h">{title} ({list.length})</h2>
      <div className="grid-cards">
        {list.map((b) => <SessionCard key={b.id} booking={b} perspective={perspective} busy={busyId === b.id} onAction={onAction} />)}
      </div>
    </section>
  );
  return (
    <div className="stack stack--lg">
      {section("Needs your response", groups.pending)}
      {section("Upcoming", groups.upcoming)}
      {section("Past and closed", groups.past)}
    </div>
  );
}

function Booking() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const isTutor = user.role === ROLES.TUTOR;
  const tab = params.get("tab") || "book";
  const [now] = useState(() => Date.now());

  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const [tutors, bookings] = await Promise.all([listTutors(user.email), listMyBookings(user)]);
    return { tutors, ...bookings };
  }, [user]);
  const { data, error, loading, reload } = useAsync(load, [KEYS.bookings, KEYS.users, KEYS.reviews]);

  const initial = useMemo(() => {
    const s = location.state || {};
    const byName = s.tutor && data?.tutors.find((t) => t.name === s.tutor)?.email;
    return { tutorEmail: s.tutorEmail || byName || "", subject: s.subject || "" };
  }, [location.state, data]);

  const run = async (status, booking) => {
    setBusyId(booking.id);
    try {
      await updateBookingStatus(booking.id, status, user);
      toast.success(`Session ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };
  const onAction = (status, booking) => (status === STATUS.CANCELLED || status === STATUS.DECLINED ? setConfirm({ status, booking }) : run(status, booking));

  const pendingCount = data?.asTutor.filter((b) => b.status === STATUS.PENDING).length ?? 0;
  const tabs = [
    { id: "book", label: "Book a session" },
    { id: "sessions", label: "My sessions" },
    ...(isTutor ? [{ id: "requests", label: pendingCount ? `Requests (${pendingCount})` : "Requests" }] : []),
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Sessions" }]}
        title="Sessions"
        description="Book learning sessions and keep track of every request."
        meta={data ? [
          { label: "upcoming", value: data.asStudent.filter((b) => ACTIVE.includes(b.status) && b.startsAt >= now).length },
          ...(isTutor ? [{ label: "awaiting your reply", value: data.asTutor.filter((b) => b.status === STATUS.PENDING).length }] : []),
          { label: "completed", value: data.asStudent.filter((b) => b.status === STATUS.COMPLETED).length },
        ] : undefined}
      />
      <div className="segmented" role="tablist" aria-label="Session views" style={{ marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setParams(t.id === "book" ? {} : { tab: t.id }, { replace: true })}>{t.label}</button>
        ))}
      </div>

      {loading ? <CardSkeletons count={2} height={220} /> : error && !data ? <ErrorState onRetry={reload} /> : (
        <div role="tabpanel">
          {tab === "book" && (
            data.tutors.length ? (
              <BookingForm key={`${initial.tutorEmail}|${initial.subject}`} tutors={data.tutors} initial={initial} onBooked={() => { navigate("/booking?tab=sessions", { replace: true, state: null }); }} />
            ) : (
              <EmptyState icon={LuUsers} title="No tutors to book yet" message="Sessions can be booked once at least one tutor has registered." />
            )
          )}
          {tab === "sessions" && (
            <SessionList items={data.asStudent} perspective="student" busyId={busyId} onAction={onAction}
              emptyTitle="No sessions yet" emptyMessage="When you book a tutor, the request and its status will appear here." />
          )}
          {tab === "requests" && isTutor && (
            <SessionList items={data.asTutor} perspective="tutor" busyId={busyId} onAction={onAction}
              emptyTitle="No requests yet" emptyMessage="Students who want to learn from you will send requests that you can accept or decline." />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm} loading={!!busyId}
        title={confirm?.status === STATUS.DECLINED ? "Decline this request?" : "Cancel this session?"}
        message={confirm?.status === STATUS.DECLINED ? "The student will be told their request was declined." : "The other person will see that this session was cancelled."}
        confirmLabel={confirm?.status === STATUS.DECLINED ? "Decline request" : "Cancel session"}
        onCancel={() => setConfirm(null)} onConfirm={() => run(confirm.status, confirm.booking)}
      />
    </>
  );
}

export default Booking;
