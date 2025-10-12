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
        
        <Route path="/profile" element={<PrivateRoute role="user">  <Profile /></PrivateRoute>} />
        <Route path="/hr-profile" element={<PrivateRoute role="hr"> <ProfileHRFull /></PrivateRoute>} />
        <Route path="/profile/edit" element={<PrivateRoute role="user">  <ProfileEdit /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
