import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCalendarPlus, LuClock, LuMapPin, LuMessageSquare, LuSearch, LuUsers, LuVideo } from "react-icons/lu";
import { LEVELS, MODES, SUBJECTS } from "../config";
import { KEYS, listTutors } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { parseSkills } from "../utils/format";
import MateUpButton from "../components/MateUpButton";
import UserLink from "../components/UserLink";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { CardSkeletons, EmptyState, ErrorState } from "../components/ui/Feedback";
import { Select } from "../components/ui/Field";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import { RatingSummary } from "../components/ui/Stars";

const PAGE_SIZE = 9;
const INITIAL = { q: "", skill: "", level: "", mode: "", minRating: "", sort: "rating" };

function TutorCard({ tutor, onView, onBook, onMessage, onMateUpChange }) {
  const skills = parseSkills(tutor.skills);
  return (
    <article className="card card--interactive tutor-card">
      <div className="tutor-card__head">
        <UserLink id={tutor.id} name={tutor.name} avatar={tutor.avatar} size={48}
          subtitle={[tutor.department, tutor.year].filter(Boolean).join(" · ")} className="tutor-card__id" />
      </div>
      <RatingSummary rating={tutor.rating} count={tutor.reviewCount} />
      <div className="chips">
        {skills.length ? skills.slice(0, 4).map((s) => <span className="chip" key={s}>{s}</span>) : <span className="chip chip--muted">No skills listed yet</span>}
        {skills.length > 4 && <span className="chip chip--muted">+{skills.length - 4}</span>}
      </div>
      <ul className="tutor-card__meta">
        {tutor.level && <li><Badge tone="primary">{tutor.level}</Badge></li>}
        {tutor.mode && <li>{tutor.mode === "Offline" ? <LuMapPin size={14} aria-hidden="true" /> : <LuVideo size={14} aria-hidden="true" />} {tutor.mode === "Both" ? "Online & offline" : `${tutor.mode}`}</li>}
        {tutor.availability && <li><LuClock size={14} aria-hidden="true" /> {tutor.availability}</li>}
        <li><LuUsers size={14} aria-hidden="true" /> {tutor.sessionsTaught} session{tutor.sessionsTaught === 1 ? "" : "s"} taught</li>
      </ul>
      <div className="tutor-card__actions">
        <Button size="sm" icon={LuCalendarPlus} onClick={() => onBook(tutor)}>Book session</Button>
        <Button size="sm" variant="secondary" iconOnly icon={LuMessageSquare} onClick={() => onMessage(tutor)} aria-label={`Message ${tutor.name}`} title="Message" />
        <Button size="sm" variant="ghost" onClick={() => onView(tutor)}>Profile</Button>
      </div>
      <div className="tutor-card__social"><MateUpButton size="sm" userId={tutor.id} userName={tutor.name} relationship={tutor.mateUp} onChange={onMateUpChange} /></div>
    </article>
  );
}

function Search() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState(INITIAL);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => ({ tutors: await listTutors(user.email) }), [user.email]);
  const { data, error, loading, reload } = useAsync(load, [KEYS.users, KEYS.reviews, KEYS.bookings, KEYS.mateup]);

  const update = (name) => (e) => { setFilters((f) => ({ ...f, [name]: e.target.value })); setPage(1); };
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(INITIAL);

  const results = useMemo(() => {
    if (!data) return [];
    const q = filters.q.trim().toLowerCase();
    const list = data.tutors.filter((t) => {
      const skills = parseSkills(t.skills);
      if (q && ![t.name, t.skills, t.department, t.availability].some((v) => (v || "").toLowerCase().includes(q))) return false;
      if (filters.skill && !skills.includes(filters.skill)) return false;
      if (filters.level && t.level !== filters.level) return false;
      if (filters.mode && t.mode !== filters.mode && t.mode !== "Both") return false;
      if (filters.minRating && t.rating < Number(filters.minRating)) return false;
      return true;
    });
    const sorters = {
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      sessions: (a, b) => b.sessionsTaught - a.sessionsTaught,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[filters.sort]);
  }, [data, filters]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const book = (t) => navigate("/booking", { state: { tutorEmail: t.email, subject: parseSkills(t.skills)[0] || "" } });
  const message = (t) => navigate(`/chat?with=${encodeURIComponent(t.email)}`);
  const openProfile = (t) => navigate(`/profile/${t.id}`);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Find a tutor" }]}
        title="Find your learning mate"
        description="Connect with tutors based on skills, subjects and interests. Send a MateUp request to stay in touch."
        meta={data ? [{ label: "tutors on LearnMate", value: data.tutors.length }, { label: "connected as mates", value: data.tutors.filter((t) => t.mateUp.status === "connected").length }] : undefined}
      >
        <div className="input-wrap input-wrap--hero" role="search">
          <LuSearch size={18} aria-hidden="true" />
          <input type="search" className="control control--hero" placeholder="Search by name, skill or department" aria-label="Search tutors" value={filters.q} onChange={update("q")} />
        </div>
      </PageHeader>

      <div className="card toolbar toolbar--filters">
        <Select aria-label="Skill" value={filters.skill} onChange={update("skill")}>
          <option value="">All skills</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select aria-label="Experience level" value={filters.level} onChange={update("level")}>
          <option value="">Any level</option>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </Select>
        <Select aria-label="Teaching mode" value={filters.mode} onChange={update("mode")}>
          <option value="">Any mode</option>
          {MODES.map((m) => <option key={m}>{m}</option>)}
        </Select>
        <Select aria-label="Minimum rating" value={filters.minRating} onChange={update("minRating")}>
          <option value="">Any rating</option>
          <option value="4">4 stars & up</option>
          <option value="3">3 stars & up</option>
        </Select>
        <Select aria-label="Sort by" value={filters.sort} onChange={update("sort")}>
          <option value="rating">Best rated</option>
          <option value="sessions">Most sessions</option>
          <option value="name">Name A–Z</option>
        </Select>
      </div>

      {loading ? (
        <div style={{ marginTop: 16 }}><CardSkeletons count={6} height={230} /></div>
      ) : error && !data ? (
        <div style={{ marginTop: 16 }}><ErrorState onRetry={reload} /></div>
      ) : !data.tutors.length ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState icon={LuUsers} title="No tutors have joined yet" message="Tutors appear here as soon as someone registers with the Tutor role." />
        </div>
      ) : (
        <>
          <div className="results-meta" aria-live="polite">
            <span>{results.length} tutor{results.length === 1 ? "" : "s"} found</span>
            {filtersActive && <Button variant="ghost" size="sm" onClick={() => { setFilters(INITIAL); setPage(1); }}>Clear filters</Button>}
          </div>
          {results.length ? (
            <>
              <div className="grid-cards">
                {visible.map((t) => <TutorCard key={t.id} tutor={t} onView={openProfile} onBook={book} onMessage={message} onMateUpChange={reload} />)}
              </div>
              <Pagination page={current} pages={pages} total={results.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          ) : (
            <EmptyState icon={LuSearch} title="No tutors match these filters" message="Try a different skill or clear the filters to see everyone."
              action={<Button variant="secondary" onClick={() => { setFilters(INITIAL); setPage(1); }}>Clear filters</Button>} />
          )}
        </>
      )}

    </>
  );
}

export default Search;
