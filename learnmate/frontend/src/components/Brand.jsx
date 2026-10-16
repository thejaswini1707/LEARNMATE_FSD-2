import { Link } from "react-router-dom";
import { LuGraduationCap } from "react-icons/lu";
import { APP_NAME } from "../config";

export default function Brand({ to = "/", onClick }) {
  return (
    <Link to={to} className="brand" onClick={onClick} aria-label={`${APP_NAME} home`}>
      <span className="brand__mark"><LuGraduationCap size={20} aria-hidden="true" /></span>
      {APP_NAME}
    </Link>
  );
}
