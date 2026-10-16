import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./contexts";
import { KEYS, getSessionUser, loginUser, logoutUser, subscribe } from "../services/api";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSessionUser());
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  /* Stay in sync with profile edits, admin changes and sign-out in other tabs. */
  useEffect(
    () =>
      subscribe([KEYS.session, KEYS.loggedIn, KEYS.users], () => {
        const next = getSessionUser();
        setUser((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }),
    []
  );

  const login = useCallback(async (email, password) => {
    const next = await loginUser(email, password);
    setUser(next);
    setJustLoggedOut(false);
    return next;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setJustLoggedOut(true);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, justLoggedOut, login, logout }), [user, justLoggedOut, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
