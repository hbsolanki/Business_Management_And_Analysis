import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Utils/Header";
import { getGlobalVariable } from "../../globalVariables";
import toast from "react-hot-toast";

const Backend = getGlobalVariable();

function OwnerRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    mobile_number: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
      password
    );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    let validationErrors = {};
    if (!validateEmail(formData.email)) {
      validationErrors.email = "Please enter a valid email address.";
    }
    if (!validatePassword(formData.password)) {
      validationErrors.password =
        "Password must be at least 8 characters long and include at least one number and one special character.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${Backend}/API/owner/registration/`,
        formData,
        { headers: { "Content-Type": "application/json" } }
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("type", "owner");
      localStorage.setItem("token_created_at", Date.now());

      toast.success("Successfully Registered!");
      navigate(`/owner/home`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Email already exists!");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
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
            Register as Owner
          </h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-900"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                onChange={handleChange}
                required
                className="mt-1 block w-full p-2 rounded-md border border-gray-300 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>

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
                onChange={handleChange}
                required
                className="mt-1 block w-full p-2 rounded-md border border-gray-300 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="mobile_number"
                className="block text-sm font-medium text-gray-900"
              >
                Mobile Number
              </label>
              <input
                id="mobile_number"
                name="mobile_number"
                type="tel"
                onChange={handleChange}
                required
                className="mt-1 block w-full p-2 rounded-md border border-gray-300 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
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
                required
                className="mt-1 block w-full p-2 rounded-md border border-gray-300 text-gray-900 shadow-sm focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
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
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
            <div className="text-center mt-2">
              <Link
                to="/owner/login"
                className="text-sm text-blue-600 hover:underline"
              >
                Already registered?{" "}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default OwnerRegistration;
