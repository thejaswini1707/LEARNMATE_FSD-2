import { Link } from "react-router-dom";
import { LuCheck, LuClock, LuMapPin, LuMessageSquare, LuStar, LuVideo, LuX } from "react-icons/lu";
import { STATUS } from "../config";
import { formatSession } from "../utils/format";
import Avatar from "./ui/Avatar";
import UserLink from "./UserLink";
import Button from "./ui/Button";
import { StatusBadge } from "./ui/Badge";

/*
  One booking. `perspective` decides who the "other person" is and which actions apply:
  tutor: Accept / Decline / Mark completed;  student: Cancel / Write a review.
*/
export default function SessionCard({ booking, perspective = "student", busy, onAction }) {
  const isTutorView = perspective === "tutor";
  const other = isTutorView ? booking.studentName || "Student" : booking.tutor;
  const otherEmail = isTutorView ? booking.studentEmail : booking.tutorEmail;
  const otherId = isTutorView ? booking.studentId : booking.tutorId;
  const { status } = booking;
  const ModeIcon = booking.mode === "Online" ? LuVideo : LuMapPin;

  return (
    <article className="card session-card">
      <div className="session-card__top">
        <Avatar name={other} size={40} />
        <div className="session-card__who">
          <h3>{booking.subject}</h3>
          <p>{isTutorView ? "Requested by " : "with "}<UserLink id={otherId} name={other} /></p>
        </div>
        <StatusBadge status={status} />
      </div>
      <ul className="session-card__meta">
        <li><LuClock size={15} aria-hidden="true" /> {formatSession(booking.startsAt)}</li>
        <li><ModeIcon size={15} aria-hidden="true" /> {booking.mode}</li>
      </ul>
      {booking.topic && <p className="session-card__topic">{booking.topic}</p>}
      <div className="session-card__actions">
        {isTutorView && status === STATUS.PENDING && (
          <>
            <Button size="sm" icon={LuCheck} loading={busy} onClick={() => onAction("Confirmed", booking)}>Accept</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction("Declined", booking)}>Decline</Button>
          </>
        )}
        {isTutorView && status === STATUS.CONFIRMED && (
          <Button size="sm" icon={LuCheck} loading={busy} onClick={() => onAction("Completed", booking)}>Mark completed</Button>
        )}
        {!isTutorView && status === STATUS.COMPLETED && !booking.reviewed && (
          <Button size="sm" variant="secondary" icon={LuStar} to={`/reviews?booking=${encodeURIComponent(booking.id)}`}>Write a review</Button>
        )}
        {!isTutorView && status === STATUS.COMPLETED && booking.reviewed && (
          <span className="badge badge--success"><LuCheck size={13} aria-hidden="true" /> Reviewed</span>
        )}
        {[STATUS.PENDING, STATUS.CONFIRMED].includes(status) && (
          <Button size="sm" variant="danger-ghost" icon={LuX} disabled={busy} onClick={() => onAction("Cancelled", booking)}>Cancel</Button>
        )}
        {otherEmail && (
          <Link className="btn btn--ghost btn--sm" to={`/chat?with=${encodeURIComponent(otherEmail)}`}>
            <LuMessageSquare size={15} aria-hidden="true" /> Message
          </Link>
        )}
      </div>
    </article>
  );
}
