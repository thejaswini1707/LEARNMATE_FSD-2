import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

/* Signs out and lands on a clean login page. */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);
}
