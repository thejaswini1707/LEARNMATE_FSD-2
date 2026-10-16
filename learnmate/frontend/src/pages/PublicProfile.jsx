import { useCallback } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LuCalendarPlus, LuClock, LuGraduationCap, LuMapPin, LuMessageSquare, LuUserX, LuUsers, LuVideo } from "react-icons/lu";
import { ROLES } from "../config";
import { KEYS, getPublicProfile } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { formatDate, parseSkills } from "../utils/format";
import MateUpButton from "../components/MateUpButton";
import UserLink from "../components/UserLink";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "../components/ui/Feedback";
import PageHeader from "../components/ui/PageHeader";
import { RatingSummary, Stars } from "../components/ui/Stars";

/* Another member's public profile. Contains only public information (the server never sends private fields). */
function PublicProfile() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const load = useCallback(() => getPublicProfile(userId), [userId]);
  const { data: p, error, loading, reload } = useAsync(load, [KEYS.mateup, KEYS.users, KEYS.reviews, KEYS.bookings]);

  if (userId === me.id) return <Navigate to="/profile" replace />;

  const crumbs = [{ label: "Home", to: me.role === ROLES.ADMIN ? "/admin" : "/dashboard" }, { label: p?.name || "Profile" }];

  if (loading) return <><PageHeader title="Profile" breadcrumbs={crumbs} /><ListSkeleton rows={5} /></>;
  if (error && !p) {
    const missing = /could not be found/i.test(error.message);
    return (
      <>
        <PageHeader title="Profile" breadcrumbs={crumbs} />
        {missing
          ? <EmptyState icon={LuUserX} title="Profile not found" message="This person may have left LearnMate, or the link is wrong." action={<Button to="/search" variant="secondary">Find tutors</Button>} />
          : <ErrorState message={error.message} onRetry={reload} />}
      </>
    );
  }

  const isTutor = p.role === ROLES.TUTOR;
  const viewerIsAdmin = me.role === ROLES.ADMIN;
  const skills = parseSkills(p.skills);
  const ModeIcon = p.mode === "Offline" ? LuMapPin : LuVideo;

  return (
    <>
      <PageHeader title="Profile" breadcrumbs={crumbs} />
      <section className="card profile-hero" aria-label={`${p.name}'s profile`}>
        <div className="profile-hero__cover" aria-hidden="true" />
        <div className="profile-hero__body">
          <Avatar name={p.name} src={p.avatar} size={96} />
          <div className="profile-hero__id">
            <div className="profile-hero__name">
              <h2>{p.name}</h2>
              <Badge tone="primary">{p.role}</Badge>
            </div>
            <p>{[p.department, p.year].filter(Boolean).join(" • ") || "Department not added yet"}</p>
            {p.college && <p>{p.college}</p>}
            {isTutor && <RatingSummary rating={p.rating} count={p.reviewCount} size={16} />}
          </div>
          {!viewerIsAdmin && (
            <div className="profile-hero__actions">
              <MateUpButton userId={p.id} userName={p.name} relationship={p.mateUp} onChange={reload} />
              <Button variant="secondary" icon={LuMessageSquare} to={`/chat?with=${encodeURIComponent(p.email)}`}>Message</Button>
              {isTutor && <Button variant="secondary" icon={LuCalendarPlus} to="/booking" state={{ tutorEmail: p.email, subject: skills[0] || "" }}>Book session</Button>}
            </div>
          )}
        </div>
        <dl className="profile-hero__stats">
          <div><dt>Mates</dt><dd>{p.mateCount}</dd></div>
          {isTutor && <div><dt>Sessions taught</dt><dd>{p.sessionsTaught}</dd></div>}
          {isTutor && <div><dt>Reviews</dt><dd>{p.reviewCount}</dd></div>}
          <div><dt>Joined</dt><dd>{p.createdAt ? formatDate(p.createdAt) : "–"}</dd></div>
        </dl>
      </section>

      <div className="profile-columns">
        <div className="stack stack--lg">
          <section className="card card__body stack" aria-labelledby="about-h">
            <h2 id="about-h">About</h2>
            <p className="profile-bio">{p.bio || `${p.name.split(" ")[0]} hasn't written a bio yet.`}</p>
          </section>

          {isTutor && (
            <section className="card card__body stack" aria-labelledby="rev-h">
              <h2 id="rev-h">Reviews {p.reviewCount > 0 && <span className="muted">({p.reviewCount})</span>}</h2>
              {p.reviews.length ? (
                <ul className="list">
                  {p.reviews.map((r) => (
                    <li className="list__item" key={r.id}>
                      <Avatar name={r.studentName} src={r.studentAvatar} size={36} />
                      <div>
                        <div className="review__line"><UserLink id={r.studentId} name={r.studentName} /> <Stars value={r.rating} size={14} /></div>
                        <div className="list__text">{r.comment}</div>
                        <div className="list__meta">{r.subject} · {formatDate(r.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>No reviews yet. Reviews appear after a completed session.</p>}
            </section>
          )}
        </div>

        <aside className="stack stack--lg">
          <section className="card card__body stack" aria-labelledby="skills-h">
            <h2 id="skills-h">Skills</h2>
            {skills.length ? <div className="chips">{skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div> : <p>No skills listed yet.</p>}
          </section>

          {isTutor && (
            <section className="card card__body stack" aria-labelledby="teach-h">
              <h2 id="teach-h">Teaching</h2>
              <ul className="facts">
                {p.level && <li><LuGraduationCap size={16} aria-hidden="true" /> {p.level}</li>}
                {p.mode && <li><ModeIcon size={16} aria-hidden="true" /> {p.mode === "Both" ? "Online & offline" : p.mode}</li>}
                <li><LuClock size={16} aria-hidden="true" /> {p.availability || "Availability not specified"}</li>
                <li><LuUsers size={16} aria-hidden="true" /> {p.sessionsTaught} session{p.sessionsTaught === 1 ? "" : "s"} taught</li>
              </ul>
            </section>
          )}

          <p className="muted privacy-note">Only public profile details are shown here. <Link to="/search">Find more tutors</Link></p>
        </aside>
      </div>
    </>
  );
}

export default PublicProfile;
