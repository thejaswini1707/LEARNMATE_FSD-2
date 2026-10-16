import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuArrowLeft, LuEllipsisVertical, LuMessageSquare, LuPin, LuReply, LuSend, LuSquareCheck, LuTrash2, LuX } from "react-icons/lu";
import { KEYS, conversationId, deleteMessages, listChatPartners, listMessages, markConversationRead, sendMessage, togglePin } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatTime } from "../utils/format";
import UserLink from "../components/UserLink";
import MateUpButton from "../components/MateUpButton";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "../components/ui/Feedback";
import PageHeader from "../components/ui/PageHeader";

function Thread({ me, partner, onBack, onMateUpChange }) {
  const toast = useToast();
  const convId = conversationId(me.email, partner.email);
  const [text, setText] = useState("");
  const [reply, setReply] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [selected, setSelected] = useState([]);
  const endRef = useRef(null);

  const load = useCallback(() => listMessages(convId), [convId]);
  const { data: messages, error, loading, reload } = useAsync(load, [KEYS.chats]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages?.length, convId]);

  /* Opening a conversation (or receiving a message while it is open and visible) marks it read. */
  const lastIncoming = messages ? [...messages].reverse().find((m) => m.from !== me.email)?.id : null;
  useEffect(() => {
    if (!lastIncoming) return undefined;
    const markIfVisible = () => { if (document.visibilityState === "visible") markConversationRead(convId).catch(() => {}); };
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [lastIncoming, convId]);
  useEffect(() => {
    if (menuId === null) return undefined;
    const close = () => setMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuId]);

  const safe = (fn) => async (...args) => { try { await fn(...args); } catch (err) { toast.error(err.message); } };

  const send = safe(async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const replyTo = reply ? { id: reply.id, text: reply.text, from: reply.from } : null;
    await sendMessage(convId, me.email, text, replyTo);
    setText(""); setReply(null);
  });
  const pin = safe(async (id) => { await togglePin(convId, id); setMenuId(null); });
  const remove = safe(async (ids) => { await deleteMessages(convId, ids); setSelected([]); setMenuId(null); });
  const toggleSelect = (id) => { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); setMenuId(null); };
  const nameOf = (email) => (email === me.email ? "You" : partner.name);

  return (
    <section className="chat__thread" aria-label={`Conversation with ${partner.name}`}>
      {selected.length ? (
        <header className="chat__head chat__head--select">
          <strong>{selected.length} selected</strong>
          <div className="row-actions">
            <Button size="sm" variant="danger" icon={LuTrash2} onClick={() => remove(selected)}>Delete</Button>
            <Button size="sm" variant="secondary" onClick={() => setSelected([])}>Cancel</Button>
          </div>
        </header>
      ) : (
        <header className="chat__head">
          <Button className="chat__back" variant="ghost" size="sm" iconOnly icon={LuArrowLeft} onClick={onBack} aria-label="Back to conversations" />
          <UserLink id={partner.id} name={partner.name} avatar={partner.avatar} size={38}
            subtitle={`${partner.role}${partner.skills ? ` · ${partner.skills.split(",").slice(0, 3).join(", ")}` : ""}`} className="chat__who" />
          <div className="chat__head-actions"><MateUpButton size="sm" userId={partner.id} userName={partner.name} relationship={partner.mateUp} onChange={onMateUpChange} /></div>
        </header>
      )}

      <div className="chat__messages" aria-live="polite">
        {loading ? <ListSkeleton rows={4} /> : error && !messages ? <ErrorState onRetry={reload} /> : !messages.length ? (
          <EmptyState compact icon={LuMessageSquare} title={`Say hello to ${partner.name.split(" ")[0]}`} message="Ask about a topic or agree on a time for a session." />
        ) : messages.map((m) => {
          const mine = m.from === me.email;
          return (
            <div key={m.id} className={`msg ${mine ? "msg--mine" : ""}`}>
              <div className={`msg__bubble ${selected.includes(m.id) ? "msg__bubble--selected" : ""}`}>
                {m.replyTo && <div className="msg__reply"><strong>{nameOf(m.replyTo.from)}</strong><span>{m.replyTo.text}</span></div>}
                <p>{m.text}</p>
                <span className="msg__time">{m.pinned && <LuPin size={11} aria-label="Pinned" />} {formatTime(m.time)}</span>
                <button type="button" className="msg__menu-btn" aria-label="Message options" aria-haspopup="true" aria-expanded={menuId === m.id}
                  onClick={(e) => { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id); }}>
                  <LuEllipsisVertical size={16} aria-hidden="true" />
                </button>
                {menuId === m.id && (
                  <div className="menu msg__menu" role="menu" onClick={(e) => e.stopPropagation()}>
                    <button type="button" role="menuitem" onClick={() => pin(m.id)}><LuPin size={15} aria-hidden="true" /> {m.pinned ? "Unpin" : "Pin"}</button>
                    <button type="button" role="menuitem" onClick={() => { setReply(m); setMenuId(null); }}><LuReply size={15} aria-hidden="true" /> Reply</button>
                    <button type="button" role="menuitem" onClick={() => toggleSelect(m.id)}><LuSquareCheck size={15} aria-hidden="true" /> Select</button>
                    <button type="button" role="menuitem" onClick={() => remove([m.id])}><LuTrash2 size={15} aria-hidden="true" /> Delete</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {reply && (
        <div className="chat__replying">
          <div><strong>Replying to {nameOf(reply.from)}</strong><p>{reply.text}</p></div>
          <Button variant="ghost" size="sm" iconOnly icon={LuX} onClick={() => setReply(null)} aria-label="Cancel reply" />
        </div>
      )}
      <form className="chat__composer" onSubmit={send}>
        <input className="control" aria-label={`Message ${partner.name}`} placeholder={`Message ${partner.name}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <Button type="submit" icon={LuSend} disabled={!text.trim()}>Send</Button>
      </form>
    </section>
  );
}

function Chat() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const activeEmail = params.get("with");

  const load = useCallback(() => listChatPartners(user), [user]);
  const { data: partners, error, loading, reload } = useAsync(load, [KEYS.chats, KEYS.users, KEYS.mateup]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (partners || []).filter((p) => !q || [p.name, p.skills, p.role].some((v) => (v || "").toLowerCase().includes(q)));
  }, [partners, query]);
  const active = partners?.find((p) => p.email === activeEmail) || null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Chat" }]}
        title="Chat"
        description="Message tutors and classmates. Conversations are securely stored and synced across your devices."
        meta={partners ? [{ label: "people to chat with", value: partners.length }, { label: "unread", value: partners.reduce((n, p) => n + (p.unread || 0), 0) }] : undefined}
      />
      {loading ? <ListSkeleton rows={5} /> : error && !partners ? <ErrorState onRetry={reload} /> : !partners.length ? (
        <EmptyState icon={LuMessageSquare} title="No one to chat with yet" message="Other students and tutors will appear here once they've registered." />
      ) : (
        <div className="card chat" data-view={active ? "thread" : "list"}>
          <aside className="chat__list" aria-label="Conversations">
            <div className="chat__search">
              <input type="search" className="control" placeholder="Search people or skills" aria-label="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul>
              {filtered.map((p) => (
                <li key={p.id}>
                  <button type="button" className={`chat__person ${p.email === activeEmail ? "is-active" : ""}`} aria-current={p.email === activeEmail || undefined}
                    onClick={() => setParams({ with: p.email }, { replace: true })}>
                    <Avatar name={p.name} src={p.avatar} size={40} />
                    <span className="chat__person-info">
                      <strong>{p.name}</strong>
                      <span className={p.unread > 0 ? "is-unread" : ""}>{p.last ? `${p.last.from === user.email ? "You: " : ""}${p.last.text}` : `${p.role}${p.skills ? ` · ${p.skills.split(",")[0]}` : ""}`}</span>
                    </span>
                    <span className="chat__aside">
                      {p.last && <time className="chat__when">{formatTime(p.last.time)}</time>}
                      {p.unread > 0 && p.email !== activeEmail && <span className="count-badge count-badge--inline" aria-label={`${p.unread} unread message${p.unread === 1 ? "" : "s"}`}>{p.unread > 9 ? "9+" : p.unread}</span>}
                    </span>
                  </button>
                </li>
              ))}
              {!filtered.length && <li><EmptyState compact title="No matches" message="Try a different name or skill." /></li>}
            </ul>
          </aside>
          {active ? (
            <Thread key={active.email} me={user} partner={active} onBack={() => setParams({}, { replace: true })} onMateUpChange={reload} />
          ) : (
            <div className="chat__thread chat__thread--empty"><EmptyState compact icon={LuMessageSquare} title="Select a conversation" message="Pick someone from the list to start chatting." /></div>
          )}
        </div>
      )}
    </>
  );
}

export default Chat;
