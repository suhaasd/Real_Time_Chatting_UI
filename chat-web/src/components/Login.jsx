import React, { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useNavigate } from "react-router-dom";
import { BASE_URL, PROFILE_URL } from "../utils/constants";

const Login = () => {
  const [emailId, setEmailId] = useState("samarth2534@gmail.com");
  const [password, setPassword] = useState("Samarth@123");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoginForm, setIsLoginForm] = useState(true);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await axios.post(
        BASE_URL + "login",
        { emailId, password },
        { withCredentials: true },
      );
      const profileRes = await axios.get(PROFILE_URL + "getProfile", {
        withCredentials: true,
      });
      dispatch(addUser(profileRes.data.data));
      return navigate("/friends");
    } catch (err) {
      setError(err?.response?.data || "Something went wrong");
    }
  };

  const handleSignup = async () => {
    try {
      const res = await axios.post(
        BASE_URL + "signup",
        { firstName, lastName, emailId, password },
        { withCredentials: true },
      );
      dispatch(addUser(res.data.data));
      return navigate("/profile");
    } catch (err) {
      setError(err?.response?.data || "Something went wrong");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-base-300 to-base-200 
                    px-4 pb-24"
    >
      <div className="card w-full max-w-md bg-base-100/80 backdrop-blur-md shadow-xl border border-primary/20 rounded-2xl">
        <div className={`card-body ${isLoginForm ? "space-y-5" : "space-y-3 py-6"}`}>

          <div className={`flex flex-col items-center text-center ${isLoginForm ? "gap-2 mb-1" : "gap-1 mb-0"}`}>
            <div className={`rounded-full bg-primary/10 flex items-center justify-center ${isLoginForm ? "w-12 h-12" : "w-10 h-10"}`}>
              <svg
                width={isLoginForm ? "22" : "18"}
                height={isLoginForm ? "22" : "18"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className={`font-bold text-primary tracking-wide ${isLoginForm ? "text-3xl" : "text-2xl"}`}>
              {isLoginForm ? "Welcome back" : "Create account"}
            </h2>
            <p className={`text-base-content/50 ${isLoginForm ? "text-sm" : "text-xs"}`}>
              {isLoginForm
                ? "Sign in to continue your conversations"
                : "Start chatting in seconds"}
            </p>
          </div>

          {!isLoginForm && (
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-base-content/80 text-xs">First Name:</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  placeholder="firstname"
                  className="input input-bordered input-sm bg-base-200/60 focus:border-primary focus:outline-none"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-base-content/80 text-xs">Last Name:</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  placeholder="lastName"
                  className="input input-bordered file-input-sm bg-base-200/60 focus:border-primary focus:outline-none"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-control">
            <label className={`label ${!isLoginForm ? "py-1" : ""}`}>
              <span className={`label-text text-base-content/80 ${!isLoginForm ? "text-xs" : ""}`}>
                Email:
              </span>
            </label>
            <input
              type="email"
              value={emailId}
              placeholder="Enter your email"
              className={`input input-bordered bg-base-200/60 focus:outline-none
                ${!isLoginForm ? "input-sm" : ""}
                ${error ? "border-error focus:border-error" : "focus:border-primary"}`}
              onChange={(e) => { setEmailId(e.target.value); setError(""); }}
            />
          </div>

          <div className="form-control">
            <label className={`label ${!isLoginForm ? "py-1" : ""}`}>
              <span className={`label-text text-base-content/80 ${!isLoginForm ? "text-xs" : ""}`}>
                Password:
              </span>
            </label>
            <input
              type="password"
              value={password}
              placeholder="Enter your password"
              className={`input input-bordered bg-base-200/60 focus:outline-none
                ${!isLoginForm ? "input-sm" : ""}
                ${error ? "border-error focus:border-error" : "focus:border-primary"}`}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            {error && (
              <label className="label pt-1">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </span>
              </label>
            )}
          </div>

          <div className="pt-2">
            <button
              className="btn btn-primary w-full text-base font-semibold tracking-wide hover:scale-[1.02] transition-all duration-300"
              onClick={isLoginForm ? handleLogin : handleSignup}
            >
              {isLoginForm ? "Login" : "Sign up"}
            </button>
          </div>

          <p className="text-center text-sm text-base-content/60">
            {isLoginForm ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              className="text-primary cursor-pointer hover:text-green-400"
              onClick={() => { setIsLoginForm((prev) => !prev); setError(""); }}
            >
              {isLoginForm ? "Sign up" : "Login"}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;