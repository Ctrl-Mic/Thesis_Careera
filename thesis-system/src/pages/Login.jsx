import { useState } from "react";

function Login({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    // Temporary login behavior.
    // We will connect this to FastAPI later.
    alert("Login successful! Backend connection will be added next.");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <button
          className="back-button"
          onClick={() => onNavigate("landing")}
        >
          ← Back
        </button>

        <div className="auth-header">
          <p className="eyebrow">
            CAREERERA
          </p>

          <h1>Welcome back.</h1>

          <p>
            Log in to continue your career journey.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="password-label">
              <label htmlFor="password">
                Password
              </label>

              <button
                type="button"
                className="forgot-button"
              >
                Forgot password?
              </button>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button full-width"
          >
            Login
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">

          <button
            type="button"
            className="social-button"
          >
            Google
          </button>

          <button
            type="button"
            className="social-button"
          >
            Facebook
          </button>

          <button
            type="button"
            className="social-button"
          >
            LinkedIn
          </button>

        </div>

        <p className="auth-footer">
          Don't have an account?
          <button
            type="button"
            className="link-button"
          >
            Create one
          </button>
        </p>

      </div>
    </div>
  );
}

export default Login;