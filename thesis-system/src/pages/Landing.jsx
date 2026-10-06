import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();
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

  const [showHelp, setShowHelp] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function switchAuthMode(createAccount) {
    setIsCreateAccount(createAccount);
    setLoginError("");

    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoginError("");

    if (isCreateAccount) {
      if (
        !formData.fullName ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        setLoginError("Please complete all required fields.");
        return;
      }

      if (formData.password.length < 8) {
        setLoginError("Password must contain at least 8 characters.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setLoginError("Passwords do not match.");
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }),
        });
        const result = await response.json();

        if (result.success === true) {
          navigate("/home");
          return;
        }

        setLoginError(result.message || "Unable to create account.");
      } catch {
        setLoginError("Unable to connect to the authentication server.");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    if (!formData.email.trim() || !formData.password) {
      setLoginError("Please enter your email/username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      const result = await response.json();

      if (result.success === true) {
        window.localStorage.setItem("careerera_current_account", formData.email.trim().toLowerCase());
        window.localStorage.setItem("careerera_current_account", formData.email.trim().toLowerCase());
        navigate("/home");
        return;
      }

      setLoginError(result.message || "Invalid email or password");
    } catch {
      setLoginError("Unable to connect to the login server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="landing-page">
      {/* =========================
          HEADER
      ========================= */}

      <header className="landing-header">
        <button className="brand-logo" onClick={() => window.scrollTo(0, 0)}>
          C<span>★</span>REERA
        </button>

        <div className="header-right">
          <button
            className="help-button"
            onClick={() => setShowHelp(!showHelp)}
          >
            <span className="help-icon">?</span>

            <span>Need Help?</span>
          </button>

          {showHelp && (
            <div className="help-popup">
              <strong>Need help?</strong>

              <p>
                Create an account to start your assessment and explore
                career recommendations based on your skills and interests.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* =========================
          HERO
      ========================= */}

      <main>
        <section className="hero-section">
          <h1 className="hero-title">
            <span className="hero-title-dark">Navigate Your</span>

            <span className="hero-title-yellow">
              Career Era <span className="sparkle">✦</span>
            </span>
          </h1>

          <p className="hero-description">
            AI-powered career recommendations mapped to your core skills,
            goals, and interests.
          </p>

        </section>

        {/* =========================
            FEATURE CARDS
        ========================= */}

        <section className="feature-section">
          {/* ASSESS */}
          <div className="feature-card feature-dark">
            <div className="feature-card-top">
              <h2>ASSESS</h2>

              <div className="feature-icon">
                <PieChartIcon />
              </div>
            </div>

            <p>
              Input skills, goals, and interests to build your career
              profile.
            </p>

          </div>

          {/* MATCH */}
          <div className="feature-card feature-match">
            <div className="feature-card-top">
              <h2>MATCH</h2>

              <div className="feature-icon">
                <MatchIcon />
              </div>
            </div>

            <p>
              Align suitable career that matches your profile.
            </p>

          </div>

          {/* RECOMMEND */}
          <div className="feature-card feature-dark">
            <div className="feature-card-top">
              <h2>RECOMMEND</h2>

              <div className="feature-icon">
                <RecommendIcon />
              </div>
            </div>

            <p>
              Get personalized career recommendations that fits your
              specialized skills.
            </p>

          </div>
        </section>

        {/* =========================
            AUTHENTICATION
        ========================= */}

        <section id="authentication" className="authentication-section">
          <div className="authentication-container">
            {/* Auth Card */}
            <div className="auth-card">
              {/* Toggle */}
              <div className="auth-toggle">
                <button
                  type="button"
                  className={!isCreateAccount ? "active" : ""}
                  onClick={() => switchAuthMode(false)}
                >
                  Login
                </button>

                <button
                  type="button"
                  className={isCreateAccount ? "active" : ""}
                  onClick={() => switchAuthMode(true)}
                >
                  Create Account
                </button>
              </div>

              {/* Auth Header */}
              <div className="auth-intro">
                {isCreateAccount ? (
                  <>
                    <div className="auth-logo">
                      C<span>★</span>REERA
                    </div>

                    <p>
                      Join Careera to create your personalized career
                      path.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Welcome Back!</h3>

                    <p>
                      Enter your credentials to access your personalized
                      career path.
                    </p>
                  </>
                )}
              </div>

              {/* Form */}
              <form className="auth-form" onSubmit={handleSubmit}>
                {/* Full Name */}
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

                {/* Email */}
                <div className="auth-field">
                  <label htmlFor="email">Email or Username</label>

                  <div className="input-wrapper">
                    <span className="input-icon">
                      <MailIcon />
                    </span>

                    <input
                      id="email"
                      name="email"
                      type="text"
                      placeholder="name@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="auth-field">
                  <div className="password-heading">
                    <label htmlFor="password">Password</label>

                    {!isCreateAccount && (
                      <button
                        type="button"
                        className="forgot-button"
                        onClick={() =>
                          alert(
                            "Forgot password functionality will be connected later."
                          )
                        }
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-icon">
                      <LockIcon />
                    </span>

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        isCreateAccount
                          ? "8+ Characters"
                          : "Enter your password"
                      }
                      value={formData.password}
                      onChange={handleChange}
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                    >
                      {showPassword ? (
                        <EyeOffIcon />
                      ) : (
                        <EyeIcon />
                      )}
                    </button>
                  </div>

                  {/* Login options */}
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

                    </div>
                  )}
                </div>

                {/* Confirm Password */}
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
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
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

                {/* Submit */}
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isCreateAccount
                    ? "Sign Up"
                    : isLoading
                      ? "Signing in..."
                      : "Login"}
                </button>
              </form>

              {loginError && (
                <p className="auth-login-feedback" role="alert">
                  {loginError}
                </p>
              )}

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

              {/* Social Buttons */}
              <div className="social-buttons">
                <button
                  type="button"
                  className="social-button"
                  onClick={() =>
                    alert("Facebook login is not connected yet.")
                  }
                >
                  <FacebookIcon />
                </button>

                <button
                  type="button"
                  className="social-button"
                  onClick={() =>
                    alert("Google login is not connected yet.")
                  }
                >
                  <GoogleIcon />
                </button>

                <button
                  type="button"
                  className="social-button"
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
                  onClick={() =>
                    switchAuthMode(!isCreateAccount)
                  }
                >
                  {isCreateAccount
                    ? " Login"
                    : " Create Account"}
                </button>
              </p>
            </div>
          </div>
        </section>
      </main>

      
    </div>
  );
}

/* =========================================
   ICONS
========================================= */

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

function PieChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3v9l7.8 4.5A9 9 0 0 1 12 21a9 9 0 0 1 0-18Z" />
      <path d="M12 3a9 9 0 0 1 7.8 4.5L12 12V3Z" />
    </svg>
  );
}

function MatchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.3-4.8 5-4.8 1.2 0 2.2.3 3 .9" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" />
      <circle cx="17.5" cy="8" r="1.4" />
      <path d="M15.5 11h4" />
    </svg>
  );
}

function RecommendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="4.5" cy="5" r="1" />
      <circle cx="4.5" cy="10" r="1" />
      <circle cx="4.5" cy="15" r="1" />

      <path d="M8 5h9" />
      <path d="M8 10h6" />
      <path d="M8 15h4" />

      <path d="M18 14v6" />
      <path d="M15 17h6" />
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
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.6c-.9.6-2 1-3.5-1-2.7 0-5-1.8-5.8-4.3H2.9v2.7A10.1 10.1 0 0 0 12 22Z"
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

export default Landing;