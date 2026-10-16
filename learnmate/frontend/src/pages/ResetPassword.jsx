import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LuCircleAlert, LuEye, LuEyeOff } from "react-icons/lu";
import { resetPassword } from "../services/api";
import { PASSWORD_RULE, checkNewPassword } from "../utils/password";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Field";

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="This link isn't valid" subtitle="The password reset link is missing or incomplete.">
        <div className="alert alert--error" role="alert"><LuCircleAlert size={18} aria-hidden="true" />Open the link from your email again, or request a new one.</div>
        <Button to="/forgot-password" size="lg" block>Request a new link</Button>
        <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
      </AuthLayout>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = {};
    const pwError = checkNewPassword(password);
    if (pwError) found.password = pwError;
    if (confirm !== password) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login", { replace: true, state: { reset: true } });
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something you haven't used before. You'll log in with it right after.">
      {formError && (
        <div className="alert alert--error" role="alert">
          <LuCircleAlert size={18} aria-hidden="true" />
          <span>{formError} <Link to="/forgot-password">Request a new link</Link></span>
        </div>
      )}
      <form onSubmit={submit} noValidate className="stack">
        <Input label="New password" type={show ? "text" : "password"} autoComplete="new-password" hint={PASSWORD_RULE} value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }} error={errors.password} required
          action={<Button variant="ghost" size="sm" iconOnly icon={show ? LuEyeOff : LuEye} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} />} />
        <Input label="Confirm new password" type={show ? "text" : "password"} autoComplete="new-password" value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }} error={errors.confirm} required />
        <Button type="submit" size="lg" block loading={loading}>{loading ? "Saving…" : "Save new password"}</Button>
      </form>
      <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
    </AuthLayout>
  );
}

export default ResetPassword;
