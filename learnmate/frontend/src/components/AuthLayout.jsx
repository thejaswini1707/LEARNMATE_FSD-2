import { LuCalendarCheck, LuMessageSquare, LuStar } from "react-icons/lu";
import Brand from "./Brand";

const POINTS = [
  { icon: LuCalendarCheck, text: "Book a session with a peer who knows the topic" },
  { icon: LuMessageSquare, text: "Ask questions in chat before and after you meet" },
  { icon: LuStar, text: "Read honest reviews before you choose a tutor" },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <Brand />
        <div className="auth__pitch">
          <h2>Learn from the classmate who just figured it out.</h2>
          <ul>
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text}><Icon size={18} aria-hidden="true" /> {text}</li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="auth__panel" id="content">
        <div className="auth__form">
          <h1>{title}</h1>
          <p className="auth__sub">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
