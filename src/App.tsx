import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProfileHRFull from "./pages/ProfileHRFull";
import ProfileEdit from "./pages/ProfileEdit";
import AuthOrRegister from "./pages/AuthOrRegister";
import PrivateRoute from "./components/PrivateRoute";
import ProfileHREdit from "./pages/ProfileHREdit";

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

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
