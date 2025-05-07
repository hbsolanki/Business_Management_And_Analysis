import { useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import Header from "../Utils/Header";
import { getGlobalVariable } from "../../globalVariables";
import toast from "react-hot-toast";

const Backend = getGlobalVariable();

function ForgotPassword() {
  const location = useLocation();
  const userType = location.pathname.includes("owner") ? "owner" : "employee";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      await axios.post(
        `${Backend}/API/${userType}/forgot-password/`,
        { email },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast.success("Reset instructions sent to your email.");
    } catch (err) {
      toast.error("Failed to send reset link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-10">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
            Forgot Password (
            {userType.charAt(0).toUpperCase() + userType.slice(1)})
          </h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-600 sm:text-sm"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center items-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>

            <div className="text-center mt-2">
              <Link
                to={`/${userType}/login`}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
