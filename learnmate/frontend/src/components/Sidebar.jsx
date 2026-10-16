import { NavLink } from "react-router-dom";
import { LuBookOpen, LuCalendarCheck, LuLayoutDashboard, LuLogOut, LuMessageSquare, LuSearch, LuShield, LuStar, LuUser, LuUsers } from "react-icons/lu";
import { ROLES } from "../config";
import { useAuth } from "../hooks/useAuth";
import { useLogout } from "../hooks/useLogout";
import { useNotifications } from "../hooks/useNotifications";
import Avatar from "./ui/Avatar";
import Brand from "./Brand";
import Button from "./ui/Button";

const MEMBER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LuLayoutDashboard },
  { to: "/search", label: "Find tutors", icon: LuSearch },
  { to: "/booking", label: "Sessions", icon: LuCalendarCheck },
  { to: "/chat", label: "Chat", icon: LuMessageSquare, badge: "messages" },
  { to: "/materials", label: "Materials", icon: LuBookOpen },
  { to: "/reviews", label: "Reviews", icon: LuStar },
  { to: "/profile", label: "Profile", icon: LuUser },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LuShield },
  { to: "/students", label: "Users", icon: LuUsers },
  { to: "/materials", label: "Materials", icon: LuBookOpen },
  { to: "/reviews", label: "Reviews", icon: LuStar },
  { to: "/profile", label: "Profile", icon: LuUser },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { unreadMessages } = useNotifications();
  const logout = useLogout();
  const items = user.role === ROLES.ADMIN ? ADMIN_NAV : MEMBER_NAV;
  return (
    <aside className="sidebar" data-open={open} aria-label="Sidebar">
      <Brand to={user.role === ROLES.ADMIN ? "/admin" : "/dashboard"} onClick={onClose} />
      <nav className="sidebar__nav" aria-label="Primary">
        {user.role === ROLES.ADMIN && <span className="sidebar__label">Administration</span>}
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} onClick={onClose} title={label} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <span className="nav-link__icon">
              <Icon size={19} aria-hidden="true" />
              {badge === "messages" && unreadMessages > 0 && <span className="count-badge count-badge--dot" aria-hidden="true">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
            </span>
            <span className="nav-link__label">{label}</span>
            {badge === "messages" && unreadMessages > 0 && <span className="count-badge count-badge--inline" aria-label={`${unreadMessages} unread messages`}>{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__user">
        <Avatar name={user.name} src={user.avatar} size={36} />
        <div className="sidebar__user-info">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
        <Button variant="ghost" size="sm" iconOnly icon={LuLogOut} onClick={logout} aria-label="Log out" title="Log out" />
      </div>
    </aside>
  );
}
