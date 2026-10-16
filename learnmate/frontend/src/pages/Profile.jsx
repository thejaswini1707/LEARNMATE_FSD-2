import { useCallback, useRef, useState } from "react";
import { LuCamera, LuPencil, LuPlus, LuX } from "react-icons/lu";
import { LEVELS, ROLES, SUBJECTS, YEARS } from "../config";
import { KEYS, getPublicProfile, listMaterials, listMateUp, listMyBookings, listReviews, updateProfile } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { fileToAvatar, formatDate, parseSkills } from "../utils/format";
import MateUpButton from "../components/MateUpButton";
import UserLink from "../components/UserLink";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Field";
import PageHeader from "../components/ui/PageHeader";
import { RatingSummary, Stars } from "../components/ui/Stars";

const toForm = (u) => ({
  name: u.name || "", mobile: u.mobile || "", department: u.department || "", college: u.college || "",
  year: u.year || "", bio: u.bio || "", level: u.level || "", mode: u.mode || "", availability: u.availability || "",
  avatar: u.avatar || "", skills: parseSkills(u.skills),
});

function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(user));
  const [skillDraft, setSkillDraft] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isTutor = user.role === ROLES.TUTOR;

  const loadStats = useCallback(async () => {
    const [{ asStudent, asTutor }, materials, reviews] = await Promise.all([listMyBookings(user), listMaterials(), listReviews()]);
    const mine = reviews.filter((r) => r.tutorEmail === user.email);
    return {
      sessions: asStudent.filter((b) => b.status === "Completed").length + asTutor.filter((b) => b.status === "Completed").length,
      materials: materials.filter((m) => m.uploaderEmail === user.email).length,
      rating: mine.length ? mine.reduce((s, r) => s + r.rating, 0) / mine.length : 0,
      reviewCount: mine.length,
    };
  }, [user]);
  const { data: stats } = useAsync(loadStats, [KEYS.bookings, KEYS.reviews, KEYS.materialsVersion]);

  const loadSocial = useCallback(async () => {
    const [mateUp, mine] = await Promise.all([listMateUp(), isTutor ? getPublicProfile(user.id) : Promise.resolve(null)]);
    return { ...mateUp, reviews: mine?.reviews || [] };
  }, [user.id, isTutor]);
  const { data: social, reload: reloadSocial } = useAsync(loadSocial, [KEYS.mateup, KEYS.reviews]);

  const set = (name) => (e) => { setForm((f) => ({ ...f, [name]: e.target.value })); setErrors((p) => ({ ...p, [name]: undefined })); };

  const addSkill = () => {
    const value = skillDraft.trim();
    if (!value) return;
    if (!form.skills.some((s) => s.toLowerCase() === value.toLowerCase())) setForm((f) => ({ ...f, skills: [...f.skills, value] }));
    setSkillDraft("");
  };

  const cancel = () => { setForm(toForm(user)); setErrors({}); setSkillDraft(""); setEditing(false); };

  const pickPhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try { const avatar = await fileToAvatar(file); setForm((f) => ({ ...f, avatar })); }
    catch (err) { toast.error(err.message); }
  };

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = "Your name can't be empty.";
    if (form.mobile && !/^\d{10}$/.test(form.mobile.replace(/[\s-]/g, ""))) found.mobile = "Enter a 10-digit mobile number.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const pending = skillDraft.trim();
      const skills = pending && !form.skills.includes(pending) ? [...form.skills, pending] : form.skills;
      await updateProfile(user.email, { ...form, name: form.name.trim(), skills: skills.join(", ") });
      setEditing(false); setSkillDraft("");
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const off = !editing;
  const yearOptions = form.year && !YEARS.includes(form.year) ? [form.year, ...YEARS] : YEARS;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: user.role === ROLES.ADMIN ? "/admin" : "/dashboard" }, { label: "My profile" }]}
        title="My profile"
        description="Keep your details and skills up to date so others can find and trust you."
        meta={social ? [{ label: social.mates.length === 1 ? "mate" : "mates", value: social.mates.length }, { label: "requests waiting", value: social.incoming.length }] : undefined}
        actions={off && <Button icon={LuPencil} onClick={() => setEditing(true)}>Edit profile</Button>} />
      <div className="profile-layout">
        <aside className="card card__body profile-card">
          <div className="profile-card__photo">
            <Avatar name={form.name} src={form.avatar} size={96} />
            {editing && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={pickPhoto} aria-label="Upload profile photo" />
                <Button size="sm" variant="secondary" icon={LuCamera} onClick={() => fileRef.current.click()}>Change photo</Button>
                {form.avatar && <Button size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, avatar: "" }))}>Remove photo</Button>}
              </>
            )}
          </div>
          <h2>{user.name}</h2>
          <Badge tone="primary">{user.role}</Badge>
          <p>{[user.department, user.year].filter(Boolean).join(" · ")}</p>
          {user.college && <p>{user.college}</p>}
          {isTutor && stats && <RatingSummary rating={stats.rating} count={stats.reviewCount} size={16} />}
          {stats && (
            <div className="profile-card__stats">
              <div><strong>{stats.sessions}</strong><span>Sessions completed</span></div>
              <div><strong>{stats.materials}</strong><span>Materials shared</span></div>
            </div>
          )}
        </aside>

        <div className="stack stack--lg">
        <form className="card card__body stack stack--lg" onSubmit={save} noValidate>
          <div>
            <h2>Personal information</h2>
            <p>{editing ? "Make your changes, then save." : "Select Edit profile to change these details."}</p>
          </div>
          <div className="form-grid">
            <Input label="Full name" value={form.name} onChange={set("name")} disabled={off} error={errors.name} required />
            <Input label="Email address" value={user.email} disabled hint="Your email is your login and can't be changed here." />
            <Input label="Mobile number" type="tel" value={form.mobile} onChange={set("mobile")} disabled={off} error={errors.mobile} />
            <Input label="Role" value={user.role} disabled />
            <Input label="Department" value={form.department} onChange={set("department")} disabled={off} />
            <Select label="Year" value={form.year} onChange={set("year")} disabled={off}>
              <option value="">Select year</option>
              {yearOptions.map((y) => <option key={y}>{y}</option>)}
            </Select>
            <div className="span-2"><Input label="College / institution" placeholder="e.g. VEMU Institute of Technology" value={form.college} onChange={set("college")} disabled={off} /></div>
          </div>

          <div className="stack">
            <h2>Skills</h2>
            <div className="chips" aria-live="polite">
              {form.skills.length ? form.skills.map((s) => (
                <span className="chip" key={s}>{s}
                  {editing && <button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))} aria-label={`Remove ${s}`}><LuX size={13} aria-hidden="true" /></button>}
                </span>
              )) : <p>{editing ? "Add the skills you can teach or want to learn." : "No skills added yet."}</p>}
            </div>
            {editing && (
              <div className="skill-add">
                <input className="control" aria-label="Add a skill" placeholder="e.g. Python, Photoshop" value={skillDraft} list="skill-suggestions"
                  onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
                <Button variant="secondary" icon={LuPlus} onClick={addSkill}>Add</Button>
                <datalist id="skill-suggestions">{SUBJECTS.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            )}
          </div>

          {isTutor && (
            <div className="stack">
              <h2>Teaching preferences</h2>
              <div className="form-grid">
                <Select label="Experience level" value={form.level} onChange={set("level")} disabled={off}>
                  <option value="">Not set</option>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </Select>
                <Select label="Teaching mode" value={form.mode} onChange={set("mode")} disabled={off}>
                  <option value="">Not set</option>
                  <option>Online</option><option>Offline</option><option value="Both">Both</option>
                </Select>
                <div className="span-2"><Input label="Availability" placeholder="e.g. Mon–Fri after 5 PM, weekends" value={form.availability} onChange={set("availability")} disabled={off} /></div>
              </div>
            </div>
          )}

          <Textarea label="About me" rows={4} placeholder="Tell others about your background and how you like to teach or learn." value={form.bio} onChange={set("bio")} disabled={off} />

          {editing && (
            <div className="form-actions">
              <Button variant="secondary" onClick={cancel} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          )}
        </form>

        {user.role !== ROLES.ADMIN && social && (
          <section className="card card__body stack stack--lg" aria-labelledby="mates-h">
            <div><h2 id="mates-h">MateUp</h2><p>People you're connected with, and requests waiting for you.</p></div>
            {social.incoming.length > 0 && (
              <div className="stack">
                <h3 className="mini-h">Requests for you ({social.incoming.length})</h3>
                <ul className="list">
                  {social.incoming.map((r) => (
                    <li className="list__item list__item--stack" key={r.requestId}>
                      <UserLink id={r.from.id} name={r.from.name} avatar={r.from.avatar} size={36} subtitle={[r.from.department, r.from.year].filter(Boolean).join(" · ") || r.from.role} />
                      <MateUpButton size="sm" userId={r.from.id} userName={r.from.name} relationship={{ status: "received", requestId: r.requestId }} onChange={reloadSocial} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="stack">
              <h3 className="mini-h">My mates ({social.mates.length})</h3>
              {social.mates.length ? (
                <ul className="list">
                  {social.mates.map((m) => (
                    <li className="list__item list__item--stack" key={m.id}>
                      <UserLink id={m.id} name={m.name} avatar={m.avatar} size={36} subtitle={[m.department, m.year].filter(Boolean).join(" · ") || m.role} />
                      <MateUpButton size="sm" userId={m.id} userName={m.name} relationship={{ status: "connected", requestId: m.requestId }} onChange={reloadSocial} />
                    </li>
                  ))}
                </ul>
              ) : <p>No mates yet. Open someone's profile and select <strong>MateUp</strong> to connect.</p>}
            </div>
            {social.outgoing.length > 0 && (
              <div className="stack">
                <h3 className="mini-h">Requests you sent ({social.outgoing.length})</h3>
                <ul className="list">
                  {social.outgoing.map((r) => (
                    <li className="list__item list__item--stack" key={r.requestId}>
                      <UserLink id={r.to.id} name={r.to.name} avatar={r.to.avatar} size={36} subtitle="Waiting for a reply" />
                      <MateUpButton size="sm" userId={r.to.id} userName={r.to.name} relationship={{ status: "sent", requestId: r.requestId }} onChange={reloadSocial} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {isTutor && social && (
          <section className="card card__body stack" aria-labelledby="my-reviews-h">
            <h2 id="my-reviews-h">Reviews about you</h2>
            {social.reviews.length ? (
              <ul className="list">
                {social.reviews.map((r) => (
                  <li className="list__item" key={r.id}>
                    <div>
                      <div className="review__line"><UserLink id={r.studentId} name={r.studentName} /> <Stars value={r.rating} size={14} /></div>
                      <div className="list__text">{r.comment}</div>
                      <div className="list__meta">{r.subject} · {formatDate(r.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p>No reviews yet. Students can review you after a completed session.</p>}
          </section>
        )}
        </div>
      </div>
    </>
  );
}

export default Profile;
