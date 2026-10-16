import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuCircleAlert, LuEye, LuEyeOff } from "react-icons/lu";
import { YEARS } from "../config";
import { registerUser } from "../services/api";
import { useToast } from "../hooks/useToast";
import { PASSWORD_RULE, checkNewPassword } from "../utils/password";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Field";

const EMPTY = { name: "", email: "", mobile: "", role: "Student", department: "", year: "", password: "", confirmPassword: "" };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Enter your full name.";
  if (!f.email.trim()) e.email = "Enter your email address.";
  else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address, like name@college.edu.";
  if (!/^\d{10}$/.test(f.mobile.replace(/[\s-]/g, ""))) e.mobile = "Enter a 10-digit mobile number.";
  if (!f.department.trim()) e.department = "Enter your department, for example Computer Science.";
  if (!f.year) e.year = "Choose your year of study.";
  const pwError = checkNewPassword(f.password);
  if (pwError) e.password = pwError;
  if (f.confirmPassword !== f.password) e.confirmPassword = "The passwords don't match.";
  return e;
}

function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await registerUser(form);
      toast.success("Account created. You can log in now.");
      navigate("/login", { state: { email: form.email.trim() } });
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join your college's peer learning community. It takes about a minute.">
      {formError && <div className="alert alert--error" role="alert"><LuCircleAlert size={18} aria-hidden="true" />{formError}</div>}
      <form onSubmit={handleRegister} noValidate className="stack">
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="field__label">I want to join as</legend>
          <div className="role-options">
            {[["Student", "Find tutors and learn"], ["Tutor", "Teach skills and share notes"]].map(([value, hint]) => (
              <label className="role-option" key={value}>
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={handleChange} />
                <span><strong>{value}</strong><small>{hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          <div className="span-2"><Input label="Full name" name="name" autoComplete="name" placeholder="Priya Sharma" value={form.name} onChange={handleChange} error={errors.name} required /></div>
          <Input label="Email address" name="email" type="email" autoComplete="email" placeholder="name@college.edu" value={form.email} onChange={handleChange} error={errors.email} required />
          <Input label="Mobile number" name="mobile" type="tel" autoComplete="tel" inputMode="numeric" placeholder="10-digit number" value={form.mobile} onChange={handleChange} error={errors.mobile} required />
          <Input label="Department" name="department" placeholder="Computer Science" value={form.department} onChange={handleChange} error={errors.department} required />
          <Select label="Year of study" name="year" value={form.year} onChange={handleChange} error={errors.year} required>
            <option value="">Select year</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </Select>
          <Input
            label="Password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" hint={PASSWORD_RULE}
            value={form.password} onChange={handleChange} error={errors.password} required
            action={<Button variant="ghost" size="sm" iconOnly icon={showPassword ? LuEyeOff : LuEye} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} />}
          />
          <Input label="Confirm password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} required />
        </div>
        <Button type="submit" size="lg" block loading={loading}>{loading ? "Creating account…" : "Create account"}</Button>
      </form>
      <p className="auth__switch">Already have an account? <Link to="/login">Log in</Link></p>
      <p className="auth__switch"><Link to="/">Back to home</Link></p>
    </AuthLayout>
  );
}

export default Register;
