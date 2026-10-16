import { LuCompass } from "react-icons/lu";
import { homeFor } from "../config";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import { EmptyState } from "../components/ui/Feedback";

export default function NotFound() {
  const { user } = useAuth();
  return (
    <main className="not-found">
      <EmptyState
        icon={LuCompass} title="We can't find that page"
        message="The link may be broken or the page may have moved."
        action={<Button to={user ? homeFor(user) : "/"}>{user ? "Back to dashboard" : "Back to home"}</Button>}
      />
    </main>
  );
}
