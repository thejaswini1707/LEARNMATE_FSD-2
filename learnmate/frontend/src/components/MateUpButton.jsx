import { useState } from "react";
import { LuCheck, LuUserCheck, LuUserPlus, LuUserX, LuX } from "react-icons/lu";
import { acceptMateUp, declineMateUp, removeMateUp, sendMateUpRequest } from "../services/api";
import { useToast } from "../hooks/useToast";
import Button from "./ui/Button";
import { ConfirmDialog } from "./ui/Modal";

/*
  The MateUp control. It renders the right thing for the relationship the SERVER reported:
    none      -> [ MateUp ]
    sent      -> [ Request Sent ] (+ Cancel)
    received  -> [ Accept ] [ Decline ]
    connected -> [ Connected ] (+ Remove)
    self      -> nothing
  The server is the authority: it blocks self-requests, duplicates and unauthorised accepts.
*/
export default function MateUpButton({ userId, userName = "this person", relationship, onChange, size }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const status = relationship?.status || "none";
  if (status === "self") return null;

  const run = async (key, action, success) => {
    setBusy(key);
    try {
      await action();
      if (success) toast.success(success);
      onChange?.();
    } catch (err) {
      toast.error(err.message);
      onChange?.(); // the state may have changed under us (e.g. they already answered) - refresh it
    } finally {
      setBusy("");
      setConfirmRemove(false);
    }
  };

  if (status === "received") {
    return (
      <span className="mateup">
        <Button size={size} icon={LuCheck} loading={busy === "accept"} disabled={!!busy && busy !== "accept"}
          onClick={() => run("accept", () => acceptMateUp(relationship.requestId), `You and ${userName} are now connected.`)}>Accept</Button>
        <Button size={size} variant="secondary" icon={LuX} loading={busy === "decline"} disabled={!!busy && busy !== "decline"}
          onClick={() => run("decline", () => declineMateUp(relationship.requestId), "Request declined.")}>Decline</Button>
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="mateup">
        <Button size={size} variant="secondary" icon={LuUserCheck} disabled aria-label={`MateUp request sent to ${userName}`}>Request Sent</Button>
        <Button size={size} variant="ghost" loading={busy === "cancel"} onClick={() => run("cancel", () => removeMateUp(userId), "Request cancelled.")}>Cancel</Button>
      </span>
    );
  }

  if (status === "connected") {
    return (
      <span className="mateup">
        <Button size={size} variant="secondary" className="btn--connected" icon={LuUserCheck} disabled aria-label={`Connected with ${userName}`}>Connected</Button>
        <Button size={size} variant="ghost" icon={LuUserX} onClick={() => setConfirmRemove(true)} aria-label={`Remove ${userName} from your mates`}>Remove</Button>
        <ConfirmDialog open={confirmRemove} loading={busy === "remove"} title="Remove this mate?"
          message={`You and ${userName} will no longer be connected on MateUp. You can send a new request later.`}
          confirmLabel="Remove mate" onCancel={() => setConfirmRemove(false)}
          onConfirm={() => run("remove", () => removeMateUp(userId), "Mate removed.")} />
      </span>
    );
  }

  return (
    <Button size={size} variant="mateup" icon={LuUserPlus} loading={busy === "send"}
      onClick={() => run("send", () => sendMateUpRequest(userId), `MateUp request sent to ${userName}.`)}>MateUp</Button>
  );
}
