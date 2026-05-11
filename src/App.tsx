import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProfileHRFull from "./pages/ProfileHRFull";
import ProfileEdit from "./pages/ProfileEdit";
import AuthOrRegister from "./pages/AuthOrRegister";
import PrivateRoute from "./components/PrivateRoute";
import ProfileHREdit from "./pages/ProfileHREdit";
import Vacancies from "./pages/Vacancies";
import CompanyProfileEdit from "./pages/CompanyProfileEdit";
import CompanyProfile from "./pages/CompanyProfile";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Tasks from "./pages/Tasks";
import HRTasks from "./pages/HRTasks";
import Expert from "./pages/Expert";
import PublicProfile from "./pages/PublicProfile";
import HRDashboard from "./pages/HRDashboard";
import MyApplications from "./pages/MyApplications";
import HRApplications from "./pages/HRApplications";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/auth" element={<AuthOrRegister />} />

        <Route
          path="/profile"
          element={
            <PrivateRoute allowedRoles={["ROLE_STUDENT"]}>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <PrivateRoute allowedRoles={["ROLE_STUDENT"]}>
              <ProfileEdit />
            </PrivateRoute>
          }
        />

        <Route
          path="/hr"
          element={
            <PrivateRoute allowedRoles={["ROLE_EMPLOYER", "ROLE_COMPANY_OWNER"]}>
              <HRDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/hr-profile"
          element={
            <PrivateRoute allowedRoles={["ROLE_EMPLOYER"]}>
              <ProfileHRFull />
            </PrivateRoute>
          }
        />
        <Route
          path="/hr-profile/edit"
          element={
            <PrivateRoute allowedRoles={["ROLE_EMPLOYER"]}>
              <ProfileHREdit />
            </PrivateRoute>
          }
        />

        <Route
          path="/vacancies"
          element={
            <PrivateRoute>
              <Vacancies />
            </PrivateRoute>
          }
        />

        <Route
          path="/company-profile"
          element={
            <PrivateRoute allowedRoles={["ROLE_COMPANY_OWNER"]}>
              <CompanyProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/company-profile/edit"
          element={
            <PrivateRoute allowedRoles={["ROLE_COMPANY_OWNER"]}>
              <CompanyProfileEdit />
            </PrivateRoute>
          }
        />

        <Route
          path="/companies"
          element={
            <PrivateRoute>
              <Companies />
            </PrivateRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PrivateRoute>
              <Users />
            </PrivateRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <Tasks />
            </PrivateRoute>
          }
        />

        <Route
          path="/hr/tasks"
          element={
            <PrivateRoute allowedRoles={["ROLE_EMPLOYER", "ROLE_COMPANY_OWNER"]}>
              <HRTasks />
            </PrivateRoute>
          }
        />

        <Route
          path="/expert"
          element={
            <PrivateRoute allowedRoles={["ROLE_EXPERT"]}>
              <Expert />
            </PrivateRoute>
          }
        />

        <Route
          path="/u/:uuid"
          element={
            <PrivateRoute>
              <PublicProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/my/applications"
          element={
            <PrivateRoute allowedRoles={["ROLE_STUDENT"]}>
              <MyApplications />
            </PrivateRoute>
          }
        />

        <Route
          path="/hr/applications"
          element={
            <PrivateRoute allowedRoles={["ROLE_EMPLOYER", "ROLE_COMPANY_OWNER"]}>
              <HRApplications />
            </PrivateRoute>
          }
        />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
