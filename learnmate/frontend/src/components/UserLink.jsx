import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Avatar from "./ui/Avatar";

/*
  A person's name (and optionally avatar) that opens their profile, like in a social app.
  Your own name opens "My profile". If the id isn't known (very old rows), it renders as plain text
  so nothing breaks.
*/
export default function UserLink({ id, name, avatar, size = 0, subtitle, className = "", stop = false, children }) {
  const { user } = useAuth();
  const label = children ?? name;
  const to = id ? (id === user?.id ? "/profile" : `/profile/${id}`) : null;
  const onClick = stop ? (e) => e.stopPropagation() : undefined;

  if (!size) {
    return to
      ? <Link to={to} className={`user-link ${className}`} onClick={onClick}>{label}</Link>
      : <span className={className}>{label}</span>;
  }

  const body = (
    <>
      <Avatar name={name} src={avatar} size={size} />
      <span className="user-link__text">
        <strong>{label}</strong>
        {subtitle && <span>{subtitle}</span>}
      </span>
    </>
  );
  return to
    ? <Link to={to} className={`user-link user-link--card ${className}`} onClick={onClick} aria-label={`Open ${name}'s profile`}>{body}</Link>
    : <span className={`user-link user-link--card ${className}`}>{body}</span>;
}

/*
  Renders an activity sentence with every person it mentions as a profile link, wherever their name
  appears ("You requested a Java session with Rahul Kumar"). `people` comes from the server.
*/
export function ActorText({ text, people = [] }) {
  const known = people.filter((p) => p?.id && p?.name);
  if (!known.length) return text;
  const byName = new Map(known.map((p) => [p.name, p.id]));
  const escaped = [...byName.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`));
  return parts.map((part, i) => (byName.has(part) ? <UserLink key={i} id={byName.get(part)} name={part} /> : part));
}
