import { useState } from "react";

function Login({ onNavigate }) {
  const [isCreateAccount, setIsCreateAccount] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
  });

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isCreateAccount) {
      if (
        !formData.fullName ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        alert("Please complete all required fields.");
        return;
      }

      if (formData.password.length < 8) {
        alert("Password must contain at least 8 characters.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      alert("Account created successfully. Prototype registration complete.");
      return;
    }

    if (!formData.email || !formData.password) {
      alert("Please enter your email/username and password.");
      return;
    }

    alert("Login submitted. Backend authentication will be connected later.");
  }

  function switchMode(createAccount) {
    setIsCreateAccount(createAccount);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  return (
    <div className="auth-page">
      {/* Top Navigation */}
      <header className="auth-header">
        <button
          className="auth-brand"
          onClick={() => onNavigate("landing")}
        >
          C<span>★</span>REERA
        </button>

        <button
          className="auth-back-button"
          onClick={() => onNavigate("landing")}
        >
          ← Back to Home
        </button>
      </header>

      {/* Authentication Card */}
      <main className="auth-main">
        <section className="auth-card">
          {/* Login / Create Account Toggle */}
          <div className="auth-toggle">
            <button
              className={!isCreateAccount ? "active" : ""}
              onClick={() => switchMode(false)}
              type="button"
            >
              Login
            </button>

            <button
              className={isCreateAccount ? "active" : ""}
              onClick={() => switchMode(true)}
              type="button"
            >
              Create Account
            </button>
          </div>

          {/* Header */}
          <div className="auth-intro">
            {isCreateAccount ? (
              <>
                <div className="auth-large-logo">
                  C<span>★</span>REERA
                </div>

                <p>
                  Join Careera to create your personalized career path.
                </p>
              </>
            ) : (
              <>
                <h1>Welcome Back!</h1>

                <p>
                  Enter your credentials to access your personalized career
                  path.
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {isCreateAccount && (
              <div className="auth-field">
                <label htmlFor="fullName">Full Name</label>

                <div className="input-wrapper">
                  <span className="input-icon">
                    <UserIcon />
                  </span>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="First Name, Surname"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">
                Email or Username
              </label>

              <div className="input-wrapper">
                <span className="input-icon">
                  <MailIcon />
                </span>

                <input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="Enter your email or username"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <span className="input-icon">
                  <LockIcon />
                </span>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isCreateAccount ? "8+ Characters" : "Enter your password"
                  }
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {!isCreateAccount && (
                <div className="password-options">
                  <label className="remember-option">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />

                    <span>Remember me on this device</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() => onNavigate("forgot-password")}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {isCreateAccount && (
              <div className="auth-field">
                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>

                <div className="input-wrapper">
                  <span className="input-icon">
                    <LockIcon />
                  </span>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit">
              {isCreateAccount ? "Sign Up" : "Login"}
              <span>→</span>
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span></span>
            <p>
              {isCreateAccount
                ? "OR SIGN UP WITH"
                : "OR CONTINUE WITH"}
            </p>
            <span></span>
          </div>

          {/* Social Login */}
          <div className="social-buttons">
            <button
              type="button"
              className="social-button"
              aria-label="Continue with Facebook"
              onClick={() =>
                alert("Facebook login is not connected yet.")
              }
            >
              <FacebookIcon />
            </button>

            <button
              type="button"
              className="social-button"
              aria-label="Continue with Google"
              onClick={() =>
                alert("Google login is not connected yet.")
              }
            >
              <GoogleIcon />
            </button>

            <button
              type="button"
              className="social-button"
              aria-label="Continue with LinkedIn"
              onClick={() =>
                alert("LinkedIn login is not connected yet.")
              }
            >
              <LinkedInIcon />
            </button>
          </div>

          {/* Bottom Switch */}
          <p className="auth-switch-text">
            {isCreateAccount
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => switchMode(!isCreateAccount)}
            >
              {isCreateAccount ? " Login" : " Create Account"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

/* =========================
   ICONS
========================= */

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.5 3.1-5.5 7-5.5s6.2 2 7 5.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="m3 3 18 18" />
      <path d="M10.5 6.3A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.8" />
      <path d="M6.7 6.8C4 8.5 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.3 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 8h3V4.5c-.5-.1-1.8-.2-3.4-.2-3.3 0-5.6 2-5.6 5.7v3.2H4.5v4h3.5v6.3h4.3v-6.3h3.6l.6-4h-4.2V10.4c0-1.2.4-2.4 1.7-2.4Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5Z"
        fill="currentColor"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.6c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.7A10.1 10.1 0 0 0 12 22Z"
        fill="currentColor"
      />
      <path
        d="M6.2 13.8a6 6 0 0 1 0-3.7V7.4H2.9a10 10 0 0 0 0 9l3.3-2.6Z"
        fill="currentColor"
      />
      <path
        d="M12 5.8c1.6 0 3 .6 4.1 1.7l3-3C17 2.8 14.7 2 12 2A10.1 10.1 0 0 0 2.9 7.4l3.3 2.7C7 7.6 9.3 5.8 12 5.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm6.5 0h3.8v1.5h.1c.5-.9 1.8-1.9 3.8-1.9 4 0 4.8 2.6 4.8 6V21h-4v-4.8c0-1.1 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V21h-4V10Z" />
    </svg>
  );
}

export default Login;