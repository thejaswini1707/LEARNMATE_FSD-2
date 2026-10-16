import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuBell, LuBellOff, LuCalendarCheck, LuMessageSquare, LuStar, LuUserPlus } from "react-icons/lu";
import { markNotificationsSeen } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { formatDateTime } from "../utils/format";
import Avatar from "./ui/Avatar";
import Button from "./ui/Button";
import MateUpButton from "./MateUpButton";
import { EmptyState } from "./ui/Feedback";

const KIND_ICON = { message: LuMessageSquare, mateup: LuUserPlus, booking: LuCalendarCheck, review: LuStar };

/*
  One notification feed for sessions, reviews, MateUp requests and chat messages.
  The red badge = unread chat messages + new items you haven't opened the bell for.
*/
export default function NotificationPanel() {
  const { user } = useAuth();
  const { items, unread, unseenInBell, reload } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    if (unseenInBell > 0) markNotificationsSeen(user); // chat messages stay unread until the chat is opened
  }, [unseenInBell, user]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  return (
    <div className="popover-anchor" ref={ref}>
      <Button
        variant="ghost" iconOnly icon={LuBell} aria-haspopup="true" aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => (open ? close() : setOpen(true))}
      />
      {unread > 0 && <span className="notif-dot" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      {open && (
        <div className="popover" role="dialog" aria-label="Notifications">
          <div className="popover__header">
            <h3>Notifications</h3>
            {unread > 0 && <span className="popover__count">{unread} unread</span>}
          </div>
          <div className="popover__body">
            {items.length ? (
              items.map((n) => {
                const Icon = KIND_ICON[n.kind] || LuBell;
                return (
                  <div key={n.id} className="notif-item" data-unread={n.unread}>
                    <Link to={n.to} className="notif-item__main" onClick={close}>
                      {n.actor ? <Avatar name={n.actor.name} src={n.actor.avatar} size={36} /> : <span className="notif-item__icon"><Icon size={18} aria-hidden="true" /></span>}
                      <span className="notif-item__text">
                        <span>{n.text}</span>
                        <small>{formatDateTime(n.ts)}</small>
                      </span>
                    </Link>
                    {n.mateUp?.actionable && (
                      <div className="notif-item__actions">
                        <MateUpButton size="sm" userId={n.actor.id} userName={n.actor.name}
                          relationship={{ status: "received", requestId: n.mateUp.requestId }} onChange={reload} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <EmptyState compact icon={LuBellOff} title="You're all caught up" message="Messages, session updates, MateUp requests and new reviews will show up here." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
