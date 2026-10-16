import { ROLES, STATUS } from "../config";
import { buildActivity, listAllBookings, listMaterials, listMateUp, listMyBookings, listReviews, listTutors, listUsers } from "./api";

/* Numbers for the member dashboard, all derived from stored records. */
export async function getDashboard(user) {
  const now = Date.now();
  const [{ asStudent, asTutor }, tutors, materials, reviews, activity, mateUp] = await Promise.all([
    listMyBookings(user), listTutors(user.email), listMaterials(), listReviews(), buildActivity(user.email), listMateUp(),
  ]);
  const upcoming = asStudent
    .filter((b) => [STATUS.PENDING, STATUS.CONFIRMED].includes(b.status) && b.startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt);
  const myReviews = reviews.filter((r) => r.tutorEmail === user.email);
  return {
    tutorCount: tutors.length,
    materialCount: materials.length,
    upcoming,
    nextSession: upcoming.find((b) => b.status === STATUS.CONFIRMED) || upcoming[0] || null,
    completedAsStudent: asStudent.filter((b) => b.status === STATUS.COMPLETED).length,
    pendingRequests: asTutor.filter((b) => b.status === STATUS.PENDING).sort((a, b) => a.startsAt - b.startsAt),
    taught: asTutor.filter((b) => b.status === STATUS.COMPLETED).length,
    myRating: myReviews.length ? myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length : 0,
    myReviewCount: myReviews.length,
    activity: activity.slice(0, 6),
    mateCount: mateUp.mates.length,
    mateRequests: mateUp.incoming,
  };
}

export async function getAdminOverview() {
  const [users, bookings, materials, reviews, activity] = await Promise.all([
    listUsers(), listAllBookings(), listMaterials(), listReviews(), buildActivity(),
  ]);
  return {
    students: users.filter((u) => u.role === ROLES.STUDENT).length,
    tutors: users.filter((u) => u.role === ROLES.TUTOR).length,
    sessions: bookings.length,
    pending: bookings.filter((b) => b.status === STATUS.PENDING).length,
    materials: materials.length,
    reviews: reviews.length,
    bookings,
    activity: activity.slice(0, 8),
  };
}
