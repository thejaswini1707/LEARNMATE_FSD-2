import { LuDownload, LuEye, LuFileText, LuPresentation, LuTrash2 } from "react-icons/lu";
import { formatBytes, formatDate } from "../utils/format";
import UserLink from "./UserLink";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

const isSlides = (type) => ["PPT", "PPTX"].includes(type);

export default function ResourceCard({ item, canRemove, onView, onDownload, onRemove }) {
  return (
    <article className="card card--interactive resource-card">
      <div className="resource-card__top">
        <span className="resource-card__icon">{isSlides(item.type) ? <LuPresentation size={22} aria-hidden="true" /> : <LuFileText size={22} aria-hidden="true" />}</span>
        <Badge>{item.type}</Badge>
      </div>
      <h3>{item.title}</h3>
      <p className="resource-card__desc">{item.description}</p>
      <div className="chips"><span className="chip">{item.subject}</span></div>
      <p className="resource-card__meta">
        <UserLink id={item.uploaderId} name={item.uploadedBy} /> · {formatDate(item.createdAt)}{item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ""}
      </p>
      <div className="resource-card__actions">
        <Button size="sm" variant="secondary" icon={LuEye} onClick={() => onView(item)}>View</Button>
        <Button size="sm" icon={LuDownload} onClick={() => onDownload(item)}>Download</Button>
        {canRemove && (
          <Button size="sm" variant="danger-ghost" iconOnly icon={LuTrash2} onClick={() => onRemove(item)} aria-label={`Remove ${item.title}`} title="Remove" />
        )}
      </div>
    </article>
  );
}
