import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuEye, LuEyeOff, LuCircleAlert, LuInfo } from "react-icons/lu";
import { homeFor } from "../config";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Field";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError("");
    const next = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address, like name@college.edu.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(location.state?.from || homeFor(user), { replace: true });
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to book sessions, chat with tutors and open your study materials.">
      {location.state?.from && !formError && (
        <div className="alert alert--info" role="status"><LuInfo size={18} aria-hidden="true" /> Please log in to continue.</div>
      )}
      {location.state?.reset && !formError && (
        <div className="alert alert--success" role="status">Your password has been updated. Log in with your new password.</div>
      )}
      {location.state?.email && !formError && (
        <div className="alert alert--success" role="status">Account created. Log in to get started.</div>
      )}
      {formError && <div className="alert alert--error" role="alert"><LuCircleAlert size={18} aria-hidden="true" />{formError}</div>}
      <form onSubmit={handleLogin} noValidate className="stack">
        <Input label="Email address" type="email" autoComplete="email" placeholder="name@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        <Input
          label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required
          action={<Button variant="ghost" size="sm" iconOnly icon={showPassword ? LuEyeOff : LuEye} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} />}
        />
        <div className="auth__forgot"><Link to="/forgot-password" state={{ email }}>Forgot password?</Link></div>
        <Button type="submit" size="lg" block loading={loading}>{loading ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="auth__switch">New to LearnMate? <Link to="/register">Create an account</Link></p>
      <p className="auth__switch"><Link to="/">Back to home</Link></p>
    </AuthLayout>
  );
}

export default Login;
