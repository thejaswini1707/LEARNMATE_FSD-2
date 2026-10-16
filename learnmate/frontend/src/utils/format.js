export const initials = (name = "") =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

export const parseSkills = (value = "") =>
  value.split(",").map((s) => s.trim()).filter(Boolean);

export const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

export const formatDate = (ts) => dateFmt.format(ts);
export const formatDateTime = (ts) => dateTimeFmt.format(ts);
export const formatTime = (ts) => timeFmt.format(ts);
export const formatSession = (startsAt) => `${weekdayFmt.format(startsAt)} · ${timeFmt.format(startsAt)}`;

export const formatBytes = (bytes = 0) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

/* Resize a picked image to a small square-ish JPEG data URL for the profile photo. */
export function fileToAvatar(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file (JPG, PNG or WebP)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(size / img.width, size / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const w = img.width * scale; const h = img.height * scale;
      canvas.getContext("2d").drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("We couldn't read that image. Try a different file.")); };
    img.src = url;
  });
}
