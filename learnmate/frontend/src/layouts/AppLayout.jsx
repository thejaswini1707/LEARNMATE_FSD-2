import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { LuLogOut, LuUser } from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { useLogout } from "../hooks/useLogout";
import { useLiveNotifications } from "../hooks/useLiveNotifications";
import NotificationsProvider from "../context/NotificationsProvider";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import Brand from "../components/Brand";
import NotificationPanel from "../components/NotificationPanel";
import Avatar from "../components/ui/Avatar";
import { homeFor } from "../config";

function UserMenu() {
  const { user } = useAuth();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu__btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Avatar name={user.name} src={user.avatar} size={32} />
        <span className="user-menu__name">{user.name.split(" ")[0]}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}><LuUser size={16} aria-hidden="true" /> My profile</Link>
          <button type="button" role="menuitem" onClick={logout}><LuLogOut size={16} aria-hidden="true" /> Log out</button>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useLiveNotifications();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="app">
      <a className="skip-link" href="#content">Skip to content</a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="main">
        <header className="topbar">
          <div className="topbar__left"><Brand to={homeFor(user)} /></div>
          <div className="topbar__right">
            <NotificationPanel />
            <UserMenu />
          </div>
        </header>
        <main id="content" className="page" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <BottomNav onMore={() => setOpen(true)} />
    </div>
  );
}

export default function AppLayout() {
  return (
    <NotificationsProvider>
      <Shell />
    </NotificationsProvider>
  );
}
