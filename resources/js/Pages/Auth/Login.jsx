import React, { useState } from "react";
import { Link, router } from "@inertiajs/react";
import axios from "axios";
import "../../../css/login.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// Set axios base URL once
axios.defaults.baseURL = "http://localhost:8000";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    try {
      const response = await axios.post("/auth/login", { email, password });

      const { user, token } = response.data;

      // Determine token key based on role
      const tokenKey = user.role === "registrar" ? "registrar_token" : "student_token";

      // Store token separately in localStorage
      localStorage.setItem(tokenKey, token);

      // Set Authorization header for future axios requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Redirect user based on role
      if (user.role === "registrar") {
        router.visit("/registrar/dashboard", { preserveState: false });
      } else if (user.role === "student") {
        router.visit("/student/dashboard", { preserveState: false });
      } else {
        router.visit("/", { preserveState: false });
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else if (error.response?.data?.message) {
        setErrors({ form: error.response.data.message });
      } else {
        setErrors({ form: "Login failed. Please try again." });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="left-panel">
        <img src="/onsts.png" alt="School Logo" />
        <h1>
          OPOL NATIONAL SECONDARY <br />
          TECHNICAL SCHOOL
        </h1>
      </div>

      <div className="right-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-title">WELCOME</div>

          {errors.form && <div className="error-message">{errors.form}</div>}

          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              name="email"
              required
            />
            <label className={email ? "filled" : ""}>EMAIL</label>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="password"
              required
              minLength={6}
            />
            <label className={password ? "filled" : ""}>PASSWORD</label>
            <span
              className="toggle-icon"
              onClick={togglePassword}
              role="button"
              tabIndex={0}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <button type="submit" className="login-button" disabled={processing}>
            {processing ? "Logging in..." : "LOGIN"}
          </button>

          <div className="links-row">
            <Link href="/forgot-password" className="forgot-password">
              forgot password
            </Link>
            <Link href="/register/registrar" className="register">
              register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
