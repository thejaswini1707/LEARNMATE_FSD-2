const { z } = require("zod");

const ROLE = z.enum(["Student", "Tutor"]); // Admin role is never client-selectable at registration
const STATUS = z.enum(["Pending", "Confirmed", "Declined", "Completed", "Cancelled"]);
const YEAR = z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year"]);
const MODE = z.enum(["Online", "Offline"]);

/** Single source of truth for the password rule. The frontend mirrors it in src/utils/password.js. */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD = z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);

const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  mobile: z.string().trim().min(1, "Please enter your mobile number."),
  password: PASSWORD,
  role: ROLE,
  department: z.string().trim().min(1, "Please enter your department."),
  year: YEAR,
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "Please enter your email."),
  password: z.string().min(1, "Please enter your password."),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "This reset link is missing its token."),
  password: PASSWORD,
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    mobile: z.string().trim().optional(),
    department: z.string().trim().optional(),
    college: z.string().trim().optional(),
    year: YEAR.optional(),
    skills: z.string().optional(),
    bio: z.string().optional(),
    level: z.enum(["Beginner", "Intermediate", "Advanced", ""]).optional(),
    mode: z.enum(["Online", "Offline", "Both", ""]).optional(),
    availability: z.string().optional(),
    avatar: z.string().optional(),
  })
  .partial();

const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    department: z.string().trim().optional(),
    year: YEAR.optional(),
    role: z.enum(["Student", "Tutor", "Admin"]).optional(),
  })
  .partial();

const bookingCreateSchema = z.object({
  tutorEmail: z.string().trim().email("Please choose a tutor."),
  subject: z.string().trim().min(1, "Please choose a subject."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a valid time."),
  mode: MODE,
  topic: z.string().trim().min(1, "Please describe what you'd like to cover."),
});

const bookingStatusSchema = z.object({ status: STATUS });

const reviewCreateSchema = z.object({
  bookingId: z.string().trim().min(1, "Please choose the completed session you want to review."),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(1, "Please share a few words about your experience."),
});

const materialFieldsSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title."),
  subject: z.string().trim().min(1, "Please choose a subject."),
  description: z.string().optional().default(""),
});

const messageCreateSchema = z.object({
  text: z.string().trim().min(1, "Message can't be empty."),
  replyTo: z
    .object({ id: z.string(), text: z.string(), from: z.string() })
    .nullable()
    .optional(),
});

const deleteMessagesSchema = z.object({
  ids: z.array(z.string()).min(1, "No messages selected."),
});

module.exports = {
  PASSWORD_MIN_LENGTH,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
  bookingCreateSchema,
  bookingStatusSchema,
  reviewCreateSchema,
  materialFieldsSchema,
  messageCreateSchema,
  deleteMessagesSchema,
};
