import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProfileHRFull from "./pages/ProfileHRFull";
import ProfileEdit from "./pages/ProfileEdit";
import AuthOrRegister from "./pages/AuthOrRegister";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/auth" element={<AuthOrRegister />} />

        {/* Личный кабинет студента / разработчика */}
        <Route
          path="/profile"
          element={
            <PrivateRoute allowedRoles={["ROLE_STUDENT", "ROLE_DEVELOPER"]}>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Редактирование профиля студента / разработчика */}
        <Route
          path="/profile/edit"
          element={
            <PrivateRoute allowedRoles={["ROLE_STUDENT", "ROLE_DEVELOPER"]}>
              <ProfileEdit />
            </PrivateRoute>
          }
        />

        {/* Кабинет HR / компании */}
        <Route
          path="/hr-profile"
          element={
            <PrivateRoute allowedRoles={["ROLE_HR", "ROLE_COMPANY"]}>
              <ProfileHRFull />
            </PrivateRoute>
          }
        />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
