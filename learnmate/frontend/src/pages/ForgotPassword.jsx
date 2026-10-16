import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LuCircleAlert, LuMailCheck, LuTriangleAlert } from "react-icons/lu";
import { requestPasswordReset } from "../services/api";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Field";

function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null); // { devResetLink? }

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim()) return setError("Enter the email address you registered with.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address, like name@college.edu.");
    setError("");
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setSent({ devResetLink: result?.devResetLink || null });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="One more step to get back into your account.">
        <div className="alert alert--success" role="status">
          <LuMailCheck size={18} aria-hidden="true" />
          <span>If an account exists for <strong>{email.trim()}</strong>, we've sent a link to reset the password.</span>
        </div>
        <ol className="mini-steps">
          <li>Open the email from LearnMate and select <strong>Choose a new password</strong>.</li>
          <li>The link works once and expires shortly, so use it soon.</li>
          <li>Set a new password (at least 8 characters), then log in with it.</li>
        </ol>
        {sent.devResetLink && (
          <div className="alert alert--warning" role="status">
            <LuTriangleAlert size={18} aria-hidden="true" />
            <span>
              <strong>Development mode:</strong> email delivery isn't configured on this server, so here is your reset link.
              {" "}<a href={sent.devResetLink}>Open the reset link</a>
            </span>
          </div>
        )}
        <p className="auth__switch">Didn't get it? Check your spam folder or <button type="button" className="link-btn" onClick={() => setSent(null)}>try again</button>.</p>
        <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter the email you registered with and we'll send you a link to choose a new one.">
      {formError && <div className="alert alert--error" role="alert"><LuCircleAlert size={18} aria-hidden="true" />{formError}</div>}
      <form onSubmit={submit} noValidate className="stack">
        <Input label="Registered email address" type="email" autoComplete="email" placeholder="name@college.edu" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }} error={error} required />
        <Button type="submit" size="lg" block loading={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="auth__switch">Remembered it? <Link to="/login">Back to log in</Link></p>
    </AuthLayout>
  );
}

export default ForgotPassword;
