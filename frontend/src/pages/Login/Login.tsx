import { useState } from "react";
import "./Login.css";
interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
}

function Login({
  onLoginSuccess,
  onRegisterClick,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

const handleLogin = (event: React.FormEvent) => {
  event.preventDefault();

  setError("");
  setLoading(true);

  // Temporary login for frontend testing.
  // Database authentication will be connected later.

  setTimeout(() => {
    if (
      email === "admin@factoryos.com" &&
      password === "admin123"
    ) {
      onLoginSuccess();
    } else {
      setError("Invalid email or password.");
    }

    setLoading(false);
  }, 500);
};

  return (
    <div className="login-page">

      <div className="login-background">

        <div className="login-grid"></div>

        <div className="login-card">

          <div className="login-logo">
            ▥
          </div>

          <h1>FactoryOS</h1>

          <p className="login-subtitle">
            Smart Factory Digital Twin
          </p>

          <div className="login-divider"></div>

          <h2>Welcome Back</h2>

          <p className="login-description">
            Sign in to access your factory dashboard
          </p>

          <form onSubmit={handleLogin}>

            <div className="login-field">

              <label>
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />

            </div>

            <div className="login-field">

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "LOGIN"}
            </button>

          </form>

          <div className="login-register">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={onRegisterClick}
            >
              Create Account
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;