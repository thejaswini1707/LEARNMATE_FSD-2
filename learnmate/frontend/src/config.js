export const APP_NAME = "LearnMate";

export const ROLES = { STUDENT: "Student", TUTOR: "Tutor", ADMIN: "Admin" };

export const STATUS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SUBJECTS = [
  "Java",
  "Python",
  "React",
  "SQL",
  "HTML & CSS",
  "Data Structures",
  "Web Development",
  "Machine Learning",
  "Artificial Intelligence",
  "Graphic Design",
  "Photoshop",
  "Video Editing",
  "Public Speaking",
];

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const MODES = ["Online", "Offline"];
export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const ALLOWED_UPLOAD_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
export const MAX_UPLOAD_MB = 25;

export const homeFor = (user) => (user?.role === ROLES.ADMIN ? "/admin" : "/dashboard");
