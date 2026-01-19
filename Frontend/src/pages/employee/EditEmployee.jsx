import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeService } from "@/features/employee/services/employeeService";

export default function EditEmployee() {
  const { id } = useParams(); // employee id
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    mobile_number: "",
    password: "",
    description: "",
    image: null,
    imagePreview: "",
  });

  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH EMPLOYEE (EDIT MODE) ---------------- */
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await employeeService.getById(id);

        setFormData((prev) => ({
          ...prev,
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          email: res.data.email || "",
          username: res.data.username || "",
          mobile_number: res.data.mobile_number || "",
          description: res.data.description || "",
          imagePreview: res.data.image || "",
        }));
      } catch (err) {
        console.error("Failed to fetch employee", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      setFormData({
        ...formData,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : formData.imagePreview,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  /* ---------------- SUBMIT UPDATE ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = new FormData();
    payload.append("first_name", formData.first_name);
    payload.append("last_name", formData.last_name);
    payload.append("email", formData.email);
    payload.append("username", formData.username);
    payload.append("mobile_number", formData.mobile_number);
    payload.append("description", formData.description);

    if (formData.password) {
      payload.append("password", formData.password);
    }
    if (formData.image) {
      payload.append("image", formData.image);
    }

    try {
      await employeeService.update(id, payload);
      navigate(-1);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 md:my-20">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Edit Employee
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              First Name
            </label>
            <input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Last Name
            </label>
            <input
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Username
            </label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Mobile Number
            </label>
            <input
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Password (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Password (optional)
            </label>
            <input
              type="password"
              name="password"
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Image
            </label>
            <input
              type="file"
              name="image"
              onChange={handleChange}
              className="mt-2 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg"
            />

            {formData.imagePreview && (
              <img
                src={formData.imagePreview}
                alt="preview"
                className="mt-3 w-32 h-32 object-cover rounded-md"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border-0 py-1.5
                         ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5
                       text-sm font-semibold text-white hover:bg-blue-500"
          >
            Update Employee
          </button>
        </form>
      </div>
    </div>
  );
}


