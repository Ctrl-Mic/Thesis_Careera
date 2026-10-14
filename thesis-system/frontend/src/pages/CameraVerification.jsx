import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyStudentFace } from "../services/studentVerification";

function CameraVerification() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function handleEnableCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
    } catch {
      setError("Camera access is required. Allow access in your browser and try again.");
    }
  }

  async function handleContinue() {
    const video = videoRef.current;
    if (!cameraReady || !video || !video.videoWidth || isSubmitting) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture a camera image. Please try again.");
      return;
    }
    context.drawImage(video, 0, 0);

    setIsSubmitting(true);
    setError("");
    try {
      const result = await verifyStudentFace(canvas.toDataURL("image/jpeg", 0.9));
      if (result.registrationComplete) {
        window.localStorage.setItem("careerera_current_account", result.user.email);
        window.localStorage.setItem("careerera_is_admin", String(result.user.isAdmin));
        window.localStorage.setItem("careerera_auth_token", result.token);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      navigate("/home", { replace: true });
    } catch (verificationError) {
      setError(verificationError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="verification-page">
      <section className="verification-card" aria-labelledby="camera-title">
        <Link className="verification-brand" to="/login" aria-label="Careera login">
          C<span>★</span>REERA
        </Link>

        <div className="verification-progress" aria-label="Verification step 2 of 2">
          <span className="complete" />
          <span className="complete" />
        </div>
        <p className="verification-step">STEP 2 OF 2</p>

        <div className="verification-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M8 16h7l3-5h12l3 5h7a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z" />
            <circle cx="24" cy="26" r="8" />
            <circle cx="24" cy="26" r="3" />
          </svg>
        </div>

        <h1 id="camera-title">Enable your camera</h1>
        <p className="verification-description">
          Take a live camera image so we can compare your face with the photo on your student ID.
        </p>

        <video
          className="verification-camera-video"
          ref={videoRef}
          aria-label="Live camera preview"
          autoPlay
          muted
          playsInline
          hidden={!cameraReady}
        />
        {!cameraReady && (
          <div className="camera-notice">
            <span aria-hidden="true">i</span>
            Your camera image is used only to verify the photo on your ID.
          </div>
        )}

        {error && <p className="verification-error" role="alert">{error}</p>}

        {!cameraReady ? (
          <button className="verification-submit" type="button" onClick={handleEnableCamera}>
            Enable camera
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button
            className="verification-submit"
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Verifying your face..." : "Verify and continue"}
            <span aria-hidden="true">→</span>
          </button>
        )}

        <button
          className="verification-back"
          type="button"
          onClick={() => navigate("/verify-student-id")}
        >
          Back to student ID
        </button>
      </section>
    </main>
  );
}

export default CameraVerification;
