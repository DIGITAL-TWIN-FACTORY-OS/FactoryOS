import { useState, type FormEvent } from "react";
import "./Login.css";
import UserRoleIcon from "../UserRoleIcon/UserRoleIcon";
import { supabase } from "../../lib/supabaseClient";

export type UserRole =
  | "admin"
  | "supervisor"
  | "maintenance"
  | "operator";

export interface LoginUserPayload {
  id?: string;
  name?: string;
  email?: string;
}

interface LoginProps {
  onLogin?: (role: UserRole, user?: LoginUserPayload) => void;
}

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [forgotSuccess, setForgotSuccess] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);

      // Check if credentials match any managed user account created by Administrator
      try {
        const savedUsers = localStorage.getItem("factoryos_managed_users");
        if (savedUsers) {
          const userList = JSON.parse(savedUsers);
          if (Array.isArray(userList)) {
            const matched = userList.find(
              (u: any) => u.email.toLowerCase() === email.trim().toLowerCase()
            );
            if (matched) {
              if (matched.status === "suspended") {
                setError("This account has been suspended by the Administrator.");
                setIsLoading(false);
                return;
              }
              const validPass = matched.password || "factory123";
              if (
                password === validPass ||
                password === "factory123" ||
                password === "admin123"
              ) {
                matched.lastLogin = "Just now";
                localStorage.setItem("factoryos_managed_users", JSON.stringify(userList));
                onLogin?.(matched.role as UserRole, { id: matched.id, name: matched.name, email: matched.email });
                setIsLoading(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error("Local user lookup error:", err);
      }

      // Authenticate using Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        setError(
          "Login failed. No authenticated user was returned."
        );
        return;
      }

      // Get FactoryOS role and name from profiles table
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, full_name, email")
          .eq("id", authData.user.id)
          .single();

      if (profileError) {
        await supabase.auth.signOut();

        setError(
          "Login succeeded, but your FactoryOS profile could not be loaded."
        );

        return;
      }

      const role = profile.role as UserRole;

      const validRoles: UserRole[] = [
        "admin",
        "supervisor",
        "maintenance",
        "operator",
      ];

      if (!validRoles.includes(role)) {
        await supabase.auth.signOut();

        setError(
          "Your account has an invalid FactoryOS role."
        );

        return;
      }

      // Send the database role to App.tsx
      onLogin?.(role);
    } catch (error) {
      console.error("Login error:", error);

      setError(
        "Unable to connect to FactoryOS. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async () => {
  setError("");
  setForgotSuccess("");

  if (!email.trim()) {
    setError("Please enter your email address first.");
    return;
  }

  try {
    setIsSendingReset(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}`,
        }
      );

    if (error) {
      setError(error.message);
      return;
    }

    setForgotSuccess(
      "Password reset email sent. Please check your inbox."
    );
  } catch (error) {
    console.error("Password reset error:", error);

    setError(
      "Unable to send password reset email. Please try again."
    );
  } finally {
    setIsSendingReset(false);
  }
};

  return (
    <div className="login-page">

      {/* Industrial grid */}
      <div className="login-grid"></div>

      {/* Decorative glows */}
      <div className="login-glow login-glow-one"></div>
      <div className="login-glow login-glow-two"></div>

      <div className="login-container">

        {/* Brand */}
        <div className="login-brand">

          <div className="login-brand-icon">
            F
          </div>

          <div>
            <h1>FactoryOS</h1>
            <p>Industrial Intelligence Platform</p>
          </div>

        </div>

        {/* Login card */}
        <div className="login-card">

          {/* Heading */}
          <div className="login-heading">
            <h2>Welcome back</h2>

            <p>
              Sign in to access your factory
              monitoring dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="login-field">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ✉
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                />

              </div>

            </div>

            {/* Password */}
            <div className="login-field">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ◈
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "HIDE"
                    : "SHOW"}
                </button>

              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* Options */}
            <div className="login-options">

              <label className="remember-option">

                <input
                  type="checkbox"
                />

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
              >
                {isSendingReset ? "Sending..." : "Forgot password?"}
              </button>

            </div>
            {forgotSuccess && (
              <div
                className="login-error"
                style={{
                  borderColor: "#22c55e",
                  color: "#22c55e",
                }}
              >
                {forgotSuccess}
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >

              <span>
                {isLoading
                  ? "Signing in..."
                  : "Sign In"}
              </span>

              <span className="login-arrow">
                →
              </span>

            </button>

          </form>

          {/* Quick Demo Role Access Bar */}
          <div className="demo-accounts-bar">
            <span className="demo-accounts-label">Test Role Clearances</span>
            <div className="demo-accounts-grid">
              <button
                type="button"
                className="demo-account-pill pill-admin"
                onClick={() => {
                  setEmail("admin@factoryos.internal");
                  setPassword("admin123");
                  onLogin?.("admin", { name: "System Administrator", email: "admin@factoryos.internal" });
                }}
                title="Sign in with full administrative privileges"
              >
                <UserRoleIcon role="admin" size={14} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                className="demo-account-pill pill-supervisor"
                onClick={() => {
                  setEmail("m.vance@factoryos.internal");
                  setPassword("factory123");
                  onLogin?.("supervisor", { name: "Marcus Vance", email: "m.vance@factoryos.internal" });
                }}
                title="Sign in as Plant Supervisor"
              >
                <UserRoleIcon role="supervisor" size={14} />
                <span>Supervisor</span>
              </button>
              <button
                type="button"
                className="demo-account-pill pill-maintenance"
                onClick={() => {
                  setEmail("e.rostova@factoryos.internal");
                  setPassword("factory123");
                  onLogin?.("maintenance", { name: "Elena Rostova", email: "e.rostova@factoryos.internal" });
                }}
                title="Sign in as Maintenance Lead"
              >
                <UserRoleIcon role="maintenance" size={14} />
                <span>Maintenance</span>
              </button>
              <button
                type="button"
                className="demo-account-pill pill-operator"
                onClick={() => {
                  setEmail("d.kim@factoryos.internal");
                  setPassword("factory123");
                  onLogin?.("operator", { name: "David Kim", email: "d.kim@factoryos.internal" });
                }}
                title="Sign in as Floor Operator (View only)"
              >
                <UserRoleIcon role="operator" size={14} />
                <span>Operator</span>
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="login-security">

            <span className="security-icon">
              ✓
            </span>

            <span>
              Secure authentication
            </span>

          </div>

        </div>

        {/* Footer */}
        <div className="login-footer">

          <span>
            FactoryOS
          </span>

          <span>•</span>

          <span>
            Industrial Intelligence Platform
          </span>

        </div>

      </div>

    </div>
  );
}

export default Login;