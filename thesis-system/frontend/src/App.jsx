import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminTools from "./pages/AdminTools";
import Assessment from "./pages/Assessment";
import CameraVerification from "./pages/CameraVerification";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
import Saved from "./pages/Saved";
import StudentIdVerification from "./pages/StudentIdVerification";

function VerificationGate() {
  const [status, setStatus] = useState(() => (
    window.localStorage.getItem("careerera_auth_token") ? "loading" : "unauthenticated"
  ));
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const token = window.localStorage.getItem("careerera_auth_token");
    if (!token) {
      return undefined;
    }

    fetch("/api/verification/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          if (isMounted) setStatus("unauthenticated");
          return;
        }
        if (!response.ok || result.success !== true) {
          throw new Error(result.message || "Unable to check your verification status.");
        }
        if (isMounted) setStatus(result.isVerified ? "verified" : "pending");
      })
      .catch((verificationError) => {
        if (!isMounted) return;
        setError(verificationError.message);
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "loading") {
    return <main className="verification-page">Checking your account...</main>;
  }
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (status === "pending") return <Navigate to="/verify-student-id" replace />;
  if (status === "error") {
    return (
      <main className="verification-page">
        <p className="verification-error" role="alert">{error}</p>
      </main>
    );
  }
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Landing />} />
        <Route element={<VerificationGate />}>
          <Route path="/home" element={<Home />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/developer-tools" element={<AdminTools />} />
          <Route path="/assessment" element={<Assessment />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-student-id" element={<StudentIdVerification />} />
        <Route path="/verify-camera" element={<CameraVerification />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;