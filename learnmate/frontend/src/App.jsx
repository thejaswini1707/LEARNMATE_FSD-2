import { Route, Routes } from "react-router-dom";
import { ROLES } from "./config";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";

import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Materials from "./pages/Materials";
import Booking from "./pages/Booking";
import Reviews from "./pages/Reviews";

import AdminDashboard from "./pages/AdminDashboard";
import Students from "./pages/Students";

const MEMBERS = [ROLES.STUDENT, ROLES.TUTOR];
const ADMIN_ONLY = [ROLES.ADMIN];

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Everything below requires a signed-in user and gets the app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Students and tutors */}
          <Route element={<ProtectedRoute roles={MEMBERS} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/chat" element={<Chat />} />
          </Route>

          {/* Any signed-in user */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/reviews" element={<Reviews />} />

          {/* Administrators */}
          <Route element={<ProtectedRoute roles={ADMIN_ONLY} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/students" element={<Students />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
