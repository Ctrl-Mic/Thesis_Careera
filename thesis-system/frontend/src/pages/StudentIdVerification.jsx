import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyStudentId } from "../services/studentVerification";

function StudentIdVerification() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setError("");
    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSelectedFile(null);
      setError("Choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setSelectedFile(null);
      setError("The image must be smaller than 5 MB.");
      return;
    }
    setSelectedFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      await verifyStudentId(selectedFile);
      navigate("/verify-camera");
    } catch (verificationError) {
      setError(verificationError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="verification-page">
      <section className="verification-card" aria-labelledby="student-id-title">
        <Link className="verification-brand" to="/login" aria-label="Careera login">
          C<span>★</span>REERA
        </Link>

        <div className="verification-progress" aria-label="Verification step 1 of 2">
          <span className="complete" />
          <span />
        </div>
        <p className="verification-step">STEP 1 OF 2</p>

        <div className="verification-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="5" y="10" width="38" height="28" rx="5" />
            <circle cx="17" cy="22" r="4" />
            <path d="M10 33c1.5-4 4-6 7-6s5.5 2 7 6M28 20h9M28 26h9" />
          </svg>
        </div>

        <h1 id="student-id-title">Upload your student ID</h1>
        <p className="verification-description">
          Upload a clear image showing your name, student ID and photo. We&apos;ll compare it with your registration.
        </p>

        <form className="verification-form" onSubmit={handleSubmit}>
          <label className="id-upload" htmlFor="student-id-image">
            <span className="id-upload-symbol" aria-hidden="true">+</span>
            <strong>{selectedFile?.name || "Choose an image to upload"}</strong>
            <span>JPG, PNG or WEBP</span>
          </label>
          <input
            className="verification-file-input"
            id="student-id-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />

          {error && <p className="verification-error" role="alert">{error}</p>}

          <button className="verification-submit" type="submit" disabled={!selectedFile || isSubmitting}>
            {isSubmitting ? "Checking your ID..." : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="verification-footnote">
          Your image is processed for this check; face data is kept temporarily only until camera verification.
        </p>
      </section>
    </main>
  );
}

export default StudentIdVerification;
