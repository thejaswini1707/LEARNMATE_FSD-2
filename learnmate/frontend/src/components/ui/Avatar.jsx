import { initials } from "../../utils/format";

export default function Avatar({ name, src, size = 40 }) {
  return (
    <span className="avatar" style={{ "--size": `${size}px` }} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : initials(name)}
    </span>
  );
}
