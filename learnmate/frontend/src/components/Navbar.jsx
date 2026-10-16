import { Link } from "react-router-dom";
import { homeFor } from "../config";
import { useAuth } from "../hooks/useAuth";
import Brand from "./Brand";
import Button from "./ui/Button";

/* Public navigation for the landing page. */
export default function Navbar() {
  const { user } = useAuth();
  return (
    <header className="public-nav">
      <div className="public-nav__inner">
        <Brand />
        <nav className="public-nav__links" aria-label="Main">
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
        </nav>
        <div className="public-nav__actions">
          {user ? (
            <Button to={homeFor(user)} size="sm">Open dashboard</Button>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm">Log in</Link>
              <Button to="/register" size="sm">Create account</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
