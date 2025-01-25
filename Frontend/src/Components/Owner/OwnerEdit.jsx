import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { getGlobalVariable } from "../../globalVariables";

const Backend = getGlobalVariable();

function OwnerEdit() {
  const [showPassword, setShowPassword] = useState(false);
  const [ownerData, setOwnerData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile_number: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Fetch owner data
  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        const response = await axios.get(`${Backend}/API/owner/home/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setOwnerData(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          mobile_number: data.mobile_number || "",
          password: "", // Keep password empty for security reasons
        });
      } catch (err) {
        toast.error("Failed to load owner data.");
      }
    };

    fetchOwnerData();
  }, [token]);

  // Validate input
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
    let validationErrors = {};

    // Validate email
    if (!validateEmail(formData.email)) {
      validationErrors.email = "Please enter a valid email address.";
    }

    // Validate password (only if not empty)
    if (formData.password && !validatePassword(formData.password)) {
      validationErrors.password =
        "Password must be at least 8 characters long, include a number, and a special character.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await axios.put(
        `${Backend}/API/owner/edit/`,
        {
          name: formData.name,
          email: formData.email,
          mobile_number: formData.mobile_number,
          password: formData.password,
        },
        {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Details successfully updated!");
      navigate(-1); // Navigate after success
    } catch (err) {
      toast.error("Error updating owner data.");
      console.error("Error updating owner data:", err);
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Registration As Owner
          </h2>
        </div>
        {ownerData ? (
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit} method="post">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Name
                </label>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Email
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  />
                  {errors.email && (
                    <p className="text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="mobile_number"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Mobile Number
                </label>
                <div className="mt-2">
                  <input
                    id="mobile_number"
                    name="mobile_number"
                    type="text"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  {errors.password && (
                    <p className="text-red-600 mt-1">{errors.password}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p>Loading owner data...</p>
        )}
      </div>
    </>
  );
}

export default OwnerEdit;
