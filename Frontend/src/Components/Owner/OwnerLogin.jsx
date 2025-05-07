import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Utils/Header";
import { getGlobalVariable } from "../../globalVariables";
import toast from "react-hot-toast";

const Backend = getGlobalVariable();

function OwnerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await axios.post(
        `${Backend}/API/owner/login/`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const accessToken = response.data.token;
      localStorage.setItem("token", accessToken);
      localStorage.setItem("type", "owner");
      localStorage.setItem("token_created_at", Date.now());

      toast.success("Successfully Logged In!");
      navigate(`/owner/home`);
    } catch (err) {
      toast.error("Invalid Email or Password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-10">
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
              Login As Owner
            </h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-900"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-gray-600 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-900"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
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
                      Loading...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </div>

              <div className="text-center mt-2">
                <Link
                  to="/owner/registration"
                  className="text-sm text-blue-600 hover:underline mr-8"
                >
                  Don't have an account?{"    "}
                </Link>
                <Link
                  to="/owner/forgot-password"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default OwnerLogin;
