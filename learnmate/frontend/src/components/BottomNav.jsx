import { NavLink } from "react-router-dom";
import { LuBookOpen, LuCalendarCheck, LuEllipsis, LuLayoutDashboard, LuMessageSquare, LuSearch, LuShield, LuStar, LuUsers } from "react-icons/lu";
import { ROLES } from "../config";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";

const MEMBER = [
  { to: "/dashboard", label: "Home", icon: LuLayoutDashboard },
  { to: "/search", label: "Tutors", icon: LuSearch },
  { to: "/booking", label: "Sessions", icon: LuCalendarCheck },
  { to: "/chat", label: "Chat", icon: LuMessageSquare, badge: "messages" },
];
const ADMIN = [
  { to: "/admin", label: "Overview", icon: LuShield },
  { to: "/students", label: "Users", icon: LuUsers },
  { to: "/materials", label: "Materials", icon: LuBookOpen },
  { to: "/reviews", label: "Reviews", icon: LuStar },
];

/* Phone-only primary navigation. "More" opens the full sidebar drawer. */
export default function BottomNav({ onMore }) {
  const { user } = useAuth();
  const { unreadMessages } = useNotifications();
  const items = user.role === ROLES.ADMIN ? ADMIN : MEMBER;
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `bottom-nav__item ${isActive ? "active" : ""}`}>
          <span className="bottom-nav__icon">
            <Icon size={22} aria-hidden="true" />
            {badge === "messages" && unreadMessages > 0 && <span className="count-badge" aria-label={`${unreadMessages} unread messages`}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
          </span>
          {label}
        </NavLink>
      ))}
      <button type="button" className="bottom-nav__item" onClick={onMore} aria-label="More navigation">
        <span className="bottom-nav__icon"><LuEllipsis size={22} aria-hidden="true" /></span>
        More
      </button>
    </nav>
  );
}
