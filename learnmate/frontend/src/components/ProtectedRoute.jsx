import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homeFor } from "../config";
import { useAuth } from "../hooks/useAuth";

/* Requires a signed-in user; optionally restricts to specific roles. */
export default function ProtectedRoute({ roles }) {
  const { user, justLoggedOut } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={justLoggedOut ? null : { from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
