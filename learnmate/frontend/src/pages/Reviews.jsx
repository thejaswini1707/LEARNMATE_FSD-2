import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuCircleCheck, LuMessageSquareText, LuStar, LuTrash2 } from "react-icons/lu";
import { ROLES } from "../config";
import { KEYS, createReview, deleteReview, listReviewableSessions, listReviews } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../utils/format";
import UserLink from "../components/UserLink";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "../components/ui/Feedback";
import { Select, Textarea } from "../components/ui/Field";
import { ConfirmDialog } from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import { Stars, StarInput } from "../components/ui/Stars";

const PAGE_SIZE = 6;

/*
  A review is about ONE completed session you attended. The server enforces this (booking must be
  yours, with that tutor, marked Completed, and not reviewed yet); this form just makes it obvious.
*/
function ReviewForm({ sessions, initialBookingId }) {
  const { user } = useAuth();
  const toast = useToast();
  const eligible = sessions.filter((s) => !s.reviewed);
  const [form, setForm] = useState({ bookingId: eligible.some((s) => s.bookingId === initialBookingId) ? initialBookingId : "", rating: 0, comment: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); setErrors((p) => ({ ...p, [name]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = {};
    if (!form.bookingId) found.bookingId = "Choose the completed session you're reviewing.";
    if (!form.rating) found.rating = "Select a star rating.";
    if (form.comment.trim().length < 10) found.comment = "Write at least 10 characters so others know what to expect.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await createReview(user, form);
      toast.success("Thanks! Your review is live.");
      setForm({ bookingId: "", rating: 0, comment: "" });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card card__body stack stack--lg" onSubmit={submit} noValidate>
      <div>
        <h2>Write a review</h2>
        <p>You can review a tutor once a session with them has been marked <strong>completed</strong>. Each session can be reviewed once.</p>
      </div>

      <fieldset className="field session-picker" style={{ border: 0, padding: 0 }}>
        <legend className="field__label">Your completed sessions</legend>
        {sessions.length === 0 ? (
          <div className="alert alert--info" role="status">
            <LuStar size={18} aria-hidden="true" />
            <span>You don't have any completed sessions yet. After a tutor marks a session completed, it will appear here. <Link to="/booking?tab=sessions">View my sessions</Link></span>
          </div>
        ) : (
          <ul className="session-picker__list">
            {sessions.map((s) => (
              <li key={s.bookingId}>
                <label className={`session-option ${s.reviewed ? "is-done" : ""} ${form.bookingId === s.bookingId ? "is-selected" : ""}`}>
                  <input type="radio" name="booking" value={s.bookingId} disabled={s.reviewed} checked={form.bookingId === s.bookingId} onChange={() => set("bookingId", s.bookingId)} />
                  <span className="session-option__body">
                    <strong>{s.subject} with {s.tutorName}</strong>
                    <small>{formatDate(new Date(`${s.date}T${s.time || "00:00"}`).getTime())}</small>
                  </span>
                  {s.reviewed
                    ? <span className="badge badge--success"><LuCircleCheck size={13} aria-hidden="true" /> Reviewed</span>
                    : <span className="badge badge--primary">Ready to review</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
        {errors.bookingId && <span className="field__error" role="alert">{errors.bookingId}</span>}
        {sessions.length > 0 && eligible.length === 0 && <p className="field__hint">You've reviewed all of your completed sessions. Thank you!</p>}
      </fieldset>

      {formError && <div className="alert alert--error" role="alert">{formError}</div>}
      <div className="field">
        <span className="field__label" id="rating-label">Rating<span className="req" aria-hidden="true">*</span></span>
        <StarInput value={form.rating} onChange={(v) => set("rating", v)} invalid={!!errors.rating} />
        {errors.rating && <span className="field__error" role="alert">{errors.rating}</span>}
      </div>
      <Textarea label="Your review" rows={4} placeholder="What went well? What could be better?" value={form.comment} onChange={(e) => set("comment", e.target.value)} error={errors.comment} required />
      <Button type="submit" loading={loading} disabled={!eligible.length}>{loading ? "Submitting…" : "Submit review"}</Button>
    </form>
  );
}

function Reviews() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [tutorFilter, setTutorFilter] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === ROLES.ADMIN;

  const load = useCallback(async () => {
    const [reviews, sessions] = await Promise.all([listReviews(), isAdmin ? Promise.resolve([]) : listReviewableSessions()]);
    return { reviews, sessions };
  }, [isAdmin]);
  const { data, error, loading, reload } = useAsync(load, [KEYS.reviews, KEYS.users, KEYS.bookings]);

  const results = useMemo(() => {
    if (!data) return [];
    const list = data.reviews.filter((r) => !tutorFilter || r.tutorEmail === tutorFilter);
    return sort === "high" ? [...list].sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt) : list;
  }, [data, tutorFilter, sort]);

  const average = results.length ? results.reduce((s, r) => s + r.rating, 0) / results.length : 0;
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const confirmRemove = async () => {
    setBusy(true);
    try { await deleteReview(removing.id); toast.success("Review deleted."); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); setRemoving(null); }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: isAdmin ? "/admin" : "/dashboard" }, { label: "Reviews" }]}
        title="Reviews"
        description={isAdmin ? "Read and moderate reviews from across LearnMate." : "Honest feedback from completed sessions helps students choose the right tutor."}
        meta={data ? [{ label: "reviews on LearnMate", value: data.reviews.length }, ...(isAdmin ? [] : [{ label: "sessions ready to review", value: data.sessions.filter((x) => !x.reviewed).length }])] : undefined}
      />
      {loading ? <ListSkeleton rows={5} /> : error && !data ? <ErrorState onRetry={reload} /> : (
        <div className={isAdmin ? "" : "reviews-layout"}>
          {!isAdmin && (
            <ReviewForm key={`${params.get("booking") || "blank"}|${data.sessions.map((x) => `${x.bookingId}${x.reviewed ? 1 : 0}`).join()}`} sessions={data.sessions} initialBookingId={params.get("booking") || ""} />
          )}
          <section className="stack" aria-label="All reviews">
            <div className="card card__body reviews-summary">
              <div>
                <h2>{tutorFilter ? "Tutor reviews" : "All reviews"}</h2>
                <p>{results.length} review{results.length === 1 ? "" : "s"}{results.length ? ` · average ${average.toFixed(1)} / 5` : ""}</p>
              </div>
              <div className="reviews-summary__filters">
                <Select aria-label="Filter by tutor" value={tutorFilter} onChange={(e) => { setTutorFilter(e.target.value); setPage(1); }}>
                  <option value="">All tutors</option>
                  {[...new Map(data.reviews.map((r) => [r.tutorEmail, r.tutorName]))].map(([email, name]) => <option key={email} value={email}>{name}</option>)}
                </Select>
                <Select aria-label="Sort reviews" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="new">Newest first</option>
                  <option value="high">Highest rated</option>
                </Select>
              </div>
            </div>
            {results.length ? (
              <>
                {visible.map((r) => (
                  <article className="card card__body review" key={r.id}>
                    <div className="review__head">
                      <Avatar name={r.studentName} src={r.studentAvatar} size={40} />
                      <div className="review__who">
                        <h3><UserLink id={r.studentId} name={r.studentName} /></h3>
                        <p>reviewed <UserLink id={r.tutorId} name={r.tutorName} /> · {r.subject}</p>
                      </div>
                      {(isAdmin || r.studentEmail === user.email) && (
                        <Button variant="danger-ghost" size="sm" iconOnly icon={LuTrash2} aria-label="Delete review" title="Delete review" onClick={() => setRemoving(r)} />
                      )}
                    </div>
                    <div className="review__rating"><Stars value={r.rating} /><span>{formatDate(r.createdAt)}</span></div>
                    <p className="review__text">{r.comment}</p>
                  </article>
                ))}
                <Pagination page={current} pages={pages} total={results.length} pageSize={PAGE_SIZE} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon={LuMessageSquareText} title="No reviews yet" message={isAdmin ? "Reviews from students will appear here." : "Finished a session? Be the first to leave a review."} />
            )}
          </section>
        </div>
      )}
      <ConfirmDialog open={!!removing} loading={busy} title="Delete this review?" message="The review will be removed permanently and the tutor's rating will be recalculated." confirmLabel="Delete review" onCancel={() => setRemoving(null)} onConfirm={confirmRemove} />
    </>
  );
}

export default Reviews;
