import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { LuBookOpen, LuCalendarCheck, LuCalendarPlus, LuCircleCheck, LuClock, LuGraduationCap, LuInbox, LuMapPin, LuMessageSquare, LuSearch, LuStar, LuUpload, LuUserPlus, LuUsers, LuVideo } from "react-icons/lu";
import { ROLES } from "../config";
import { KEYS, updateBookingStatus } from "../services/api";
import { getDashboard } from "../services/dashboardAPI";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { useNotifications } from "../hooks/useNotifications";
import { firstName, formatDateTime, formatSession, greeting } from "../utils/format";
import { StatCard } from "../components/DashboardCards";
import SessionCard from "../components/SessionCard";
import MateUpButton from "../components/MateUpButton";
import UserLink, { ActorText } from "../components/UserLink";
import Button from "../components/ui/Button";
import { CardSkeletons, EmptyState, ErrorState } from "../components/ui/Feedback";
import PageHeader from "../components/ui/PageHeader";

const WATCH = [KEYS.bookings, KEYS.reviews, KEYS.users, KEYS.materialsVersion, KEYS.mateup];

const ACTIVITY_ICON = { user: LuUsers, booking: LuCalendarCheck, material: LuBookOpen, review: LuStar };

function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [hello] = useState(greeting);
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(() => getDashboard(user), [user]);
  const { data, error, loading, reload } = useAsync(load, WATCH);
  const isTutor = user.role === ROLES.TUTOR;
  const { unreadMessages } = useNotifications();

  const respond = async (status, booking) => {
    setBusyId(booking.id);
    try {
      await updateBookingStatus(booking.id, status, user);
      toast.success(`Session ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <PageHeader
      variant="hero"
      eyebrow={isTutor ? "Tutor dashboard" : "Student dashboard"}
      title={`${hello}, ${firstName(user.name)}`}
      description={isTutor ? "Here's what's happening with your tutoring today." : "Here's your learning at a glance."}
      meta={data ? [
        { label: unreadMessages === 1 ? "unread message" : "unread messages", value: unreadMessages },
        { label: data.mateCount === 1 ? "mate" : "mates", value: data.mateCount },
        { label: data.mateRequests.length === 1 ? "MateUp request" : "MateUp requests", value: data.mateRequests.length },
      ] : undefined}
      actions={<><Button to="/search" variant="light" icon={LuSearch}>Find a tutor</Button><Button to="/booking?tab=sessions" variant="hero-outline">My sessions</Button></>}
    />
  );

  if (loading) return <>{header}<CardSkeletons count={4} height={110} /></>;
  if (error && !data) return <>{header}<ErrorState onRetry={reload} /></>;

  const next = data.nextSession;
  const stats = isTutor
    ? [
        { icon: LuInbox, value: data.pendingRequests.length, label: "Pending requests", tone: "accent" },
        { icon: LuGraduationCap, value: data.taught, label: "Sessions taught", tone: "success" },
        { icon: LuStar, value: data.myReviewCount ? data.myRating.toFixed(1) : "–", label: data.myReviewCount ? `Rating from ${data.myReviewCount} review${data.myReviewCount > 1 ? "s" : ""}` : "No reviews yet" },
        { icon: LuBookOpen, value: data.materialCount, label: "Study materials" },
      ]
    : [
        { icon: LuUsers, value: data.tutorCount, label: "Tutors available" },
        { icon: LuCalendarCheck, value: data.upcoming.length, label: "Upcoming sessions", tone: "accent" },
        { icon: LuCircleCheck, value: data.completedAsStudent, label: "Sessions completed", tone: "success" },
        { icon: LuBookOpen, value: data.materialCount, label: "Study materials" },
      ];

  return (
    <>
      {header}
      <div className="stat-grid">{stats.map((s) => <StatCard key={s.label} {...s} />)}</div>

      <div className="dash-grid">
        <div className="stack stack--lg">
          <section className={`card next-session ${next ? "next-session--filled" : ""}`} aria-labelledby="next-heading">
            {next ? (
              <>
                <h2 id="next-heading">Next session</h2>
                <p className="next-session__title">{next.subject} with {next.tutor}</p>
                <ul className="next-session__meta">
                  <li><LuClock size={16} aria-hidden="true" /> {formatSession(next.startsAt)}</li>
                  <li>{next.mode === "Online" ? <LuVideo size={16} aria-hidden="true" /> : <LuMapPin size={16} aria-hidden="true" />} {next.mode}</li>
                  <li>{next.status === "Confirmed" ? "Confirmed by your tutor" : "Waiting for tutor to confirm"}</li>
                </ul>
                <div className="next-session__actions">
                  <Button to="/booking?tab=sessions" variant="light">View details</Button>
                  <Link className="btn btn--sm next-session__link" to={`/chat?with=${encodeURIComponent(next.tutorEmail || "")}`}><LuMessageSquare size={15} aria-hidden="true" /> Message tutor</Link>
                </div>
              </>
            ) : (
              <EmptyState compact icon={LuCalendarPlus} title="No upcoming sessions" message="Book a session with a peer tutor to see it here."
                action={<Button to="/search" variant="secondary">Browse tutors</Button>} />
            )}
          </section>

          {isTutor && (
            <section className="card" aria-labelledby="req-heading">
              <div className="card__header"><h2 id="req-heading">Session requests</h2>{data.pendingRequests.length > 0 && <Link to="/booking?tab=requests">See all</Link>}</div>
              <div className="card__body">
                {data.pendingRequests.length ? (
                  <div className="stack">
                    {data.pendingRequests.slice(0, 3).map((b) => (
                      <SessionCard key={b.id} booking={b} perspective="tutor" busy={busyId === b.id} onAction={respond} />
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No pending requests" message="When a student asks to book you, the request shows up here." />
                )}
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="activity-heading">
            <div className="card__header"><h2 id="activity-heading">Recent activity</h2></div>
            <div className="card__body">
              {data.activity.length ? (
                <ul className="list">
                  {data.activity.map((a) => {
                    const Icon = ACTIVITY_ICON[a.kind] || LuCircleCheck;
                    return (
                      <li className="list__item" key={a.id}>
                        <span className="list__dot"><Icon size={16} aria-hidden="true" /></span>
                        <div><div className="list__text"><ActorText text={a.text} people={a.people} /></div><div className="list__meta">{formatDateTime(a.ts)}</div></div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact title="Nothing here yet" message="Book a session, upload notes or leave a review and your activity will appear here." />
              )}
            </div>
          </section>
        </div>

        <aside className="stack stack--lg">
          <section className="card" aria-labelledby="quick-heading">
            <div className="card__header"><h2 id="quick-heading">Quick actions</h2></div>
            <div className="card__body quick-actions">
              <Button to="/search" variant="secondary" icon={LuSearch} block>Find a tutor</Button>
              <Button to="/booking" variant="secondary" icon={LuCalendarPlus} block>Book a session</Button>
              <Button to="/materials?upload=1" variant="secondary" icon={LuUpload} block>Upload notes</Button>
              <Button to="/materials" variant="secondary" icon={LuBookOpen} block>Browse materials</Button>
            </div>
          </section>

          <section className="card" aria-labelledby="mate-heading">
            <div className="card__header"><h2 id="mate-heading">MateUp requests</h2>{data.mateCount > 0 && <span className="muted">{data.mateCount} mate{data.mateCount === 1 ? "" : "s"}</span>}</div>
            <div className="card__body">
              {data.mateRequests.length ? (
                <ul className="list">
                  {data.mateRequests.map((r) => (
                    <li className="list__item list__item--stack" key={r.requestId}>
                      <UserLink id={r.from.id} name={r.from.name} avatar={r.from.avatar} size={36} subtitle={[r.from.department, r.from.year].filter(Boolean).join(" · ") || r.from.role} />
                      <MateUpButton size="sm" userId={r.from.id} userName={r.from.name} relationship={{ status: "received", requestId: r.requestId }} onChange={reload} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={LuUserPlus} title="No pending requests" message="When someone sends you a MateUp request, you can accept it here." />
              )}
            </div>
          </section>

          {!isTutor && data.upcoming.length > 1 && (
            <section className="card" aria-labelledby="up-heading">
              <div className="card__header"><h2 id="up-heading">Also coming up</h2></div>
              <div className="card__body">
                <ul className="list">
                  {data.upcoming.filter((b) => b.id !== next?.id).slice(0, 4).map((b) => (
                    <li className="list__item" key={b.id}>
                      <span className="list__dot"><LuClock size={16} aria-hidden="true" /></span>
                      <div><div className="list__text">{b.subject} with {b.tutor}</div><div className="list__meta">{formatSession(b.startsAt)}</div></div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

export default Dashboard;
