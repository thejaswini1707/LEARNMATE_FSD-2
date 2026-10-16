import { useCallback } from "react";
import { LuArrowRight, LuArrowLeftRight, LuBookOpen, LuCalendarCheck, LuMessageSquare, LuSearch, LuStar, LuUserPen } from "react-icons/lu";
import { KEYS, getPublicStats } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import Navbar from "../components/Navbar";
import Button from "../components/ui/Button";

const WANT = ["Python", "SQL", "Photoshop", "Public Speaking", "Machine Learning"];
const TEACH = ["Java", "React", "Video Editing", "Data Structures", "Graphic Design"];

const FEATURES = [
  { icon: LuUserPen, title: "Skill-first profiles", text: "List what you can teach, your level and when you're free, so the right people find you." },
  { icon: LuSearch, title: "Search that narrows fast", text: "Filter tutors by skill, experience level, rating and online or offline teaching." },
  { icon: LuCalendarCheck, title: "Sessions you can track", text: "Send a request, let the tutor accept or decline, and follow it through to completion." },
  { icon: LuMessageSquare, title: "Built-in chat", text: "Clear up details before a session and follow up afterwards without leaving LearnMate." },
  { icon: LuBookOpen, title: "Shared study materials", text: "Upload PDFs, documents and slides so your whole batch can find them by subject." },
  { icon: LuStar, title: "Honest reviews", text: "Rate tutors after a session so the next learner knows who to trust." },
];

const STEPS = [
  { title: "Create your profile", text: "Sign up as a student or tutor and add your skills." },
  { title: "Find a tutor", text: "Search by skill, level and rating." },
  { title: "Book a session", text: "Pick a time and mode. The tutor confirms." },
  { title: "Learn, then review", text: "Meet, ask questions, and leave a rating." },
];

function Home() {
  const load = useCallback(() => getPublicStats(), []);
  const { data: stats } = useAsync(load, [KEYS.users, KEYS.materialsVersion]);
  const hasStats = stats && (stats.students + stats.tutors + stats.materials > 0);

  return (
    <div className="landing">
      <a className="skip-link" href="#content">Skip to content</a>
      <Navbar />
      <main id="content">
        <section className="hero">
          <div className="hero__text">
            <h1>Learn from the classmate who just figured it out.</h1>
            <p>
              LearnMate connects students with peer tutors on your campus. Find someone who knows the topic,
              book a session, chat, share notes and leave a review afterwards.
            </p>
            <div className="hero__cta">
              <Button to="/register" size="lg" iconRight={LuArrowRight}>Create free account</Button>
              <Button to="/login" size="lg" variant="secondary">Log in</Button>
            </div>
            {hasStats && (
              <p className="hero__stats" aria-label="Community size">
                <strong>{stats.students}</strong> students · <strong>{stats.tutors}</strong> tutors · <strong>{stats.materials}</strong> study materials shared
              </p>
            )}
          </div>

          <div className="skill-board card" aria-label="Example of skills students exchange">
            <div>
              <h2>I want to learn</h2>
              <div className="chips">{WANT.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            </div>
            <div className="skill-board__swap" aria-hidden="true"><LuArrowLeftRight size={20} /></div>
            <div>
              <h2>I can teach</h2>
              <div className="chips">{TEACH.map((s) => <span className="chip chip--solid" key={s}>{s}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="section__head">
            <h2>Everything a study group needs, in one place</h2>
            <p>From finding the right person to saying thanks afterwards.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article className="card feature" key={title}>
                <span className="feature__icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--tint" id="how-it-works">
          <div className="section__head">
            <h2>How LearnMate works</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="steps__num" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="cta-band">
          <h2>Ready to learn with your peers?</h2>
          <p>Create an account and find your first tutor today.</p>
          <Button to="/register" size="lg" variant="light">Get started</Button>
        </section>
      </main>
      <footer className="footer">© 2026 LearnMate · A student-to-student learning platform</footer>
    </div>
  );
}

export default Home;
