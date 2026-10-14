import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setMessage("If the account exists, password reset instructions will be sent.");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>

        <p>Enter your email address to reset your password.</p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {error && <p className="error">{error}</p>}

          {message && <p className="success">{message}</p>}

          <button type="submit" className="button full-width">
            Reset Password
          </button>
        </form>

        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}

export default ForgotPassword;