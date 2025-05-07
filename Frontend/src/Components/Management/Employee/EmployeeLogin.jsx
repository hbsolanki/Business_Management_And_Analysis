import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../Utils/Header";
import { getGlobalVariable } from "../../../globalVariables";
import { toast } from "react-hot-toast";

const Backend = getGlobalVariable();

function EmployeeLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        `${Backend}/API/employee/login/page/`,
        formData,
        { headers: { "Content-Type": "application/json" } }
      );

      const accessToken = response.data.token;
      const oeid = response.data.oeid;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("type", "employee");
      localStorage.setItem("token_created_at", Date.now());

      toast.success("Login successful!");
      navigate(`/employee/dashboard/${oeid}`);
    } catch (err) {
      toast.error("Invalid credentials, please try again!");
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
            Login Into Your Account
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
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
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
                to="/employee/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeLogin;
