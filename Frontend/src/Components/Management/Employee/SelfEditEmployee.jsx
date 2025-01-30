import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
const Backend = getGlobalVariable();

function SelfEditEmployee() {
  let { oeid } = useParams();
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    mobile: "",
    address: "",
    password: "",
    imageFile: null, // Separate image file state
    image_url: "", // Store image URL for preview
  });
  const [loading, setLoading] = useState(false); // To track loading status

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(
          `${Backend}/API/employee/one/${oeid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );

        const data = response.data;
        setEmployeeData(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          email: data.email || "",
          mobile: data.mobile || "",
          address: data.address || "",
          password: data.password || "",
          imageFile: null, // No file on load
          image_url: data.image_url || "", // Set the image URL for preview
        });
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [oeid]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      setFormData({
        ...formData,
        imageFile: file,
        image_url: URL.createObjectURL(file), // Create object URL for image preview
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleImageRemove = () => {
    setFormData({
      ...formData,
      imageFile: null,
      image_url: "", // Clear image URL on removal
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading

    let token = localStorage.getItem("token");

    // Create FormData object to handle both text fields and image
    const formDataToSend = new FormData();
    for (const key in formData) {
      if (formData[key]) {
        formDataToSend.append(key, formData[key]);
      }
    }

    try {
      await axios.post(
        `${Backend}/API/employee/${oeid}/edit/`,
        formDataToSend, // Send FormData object
        {
          headers: {
            "Content-Type": "multipart/form-data", // Ensure multipart/form-data for file upload
            Authorization: `${token}`,
          },
        }
      );
      navigate(-1);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false); // Stop loading after request
    }
  };

  if (!employeeData)
    return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Edit Employee
          </h2>
        </div>

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
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Address
              </label>
              <div className="mt-2">
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="mobile"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Mobile No
              </label>
              <div className="mt-2">
                <input
                  id="mobile"
                  name="mobile"
                  type="number"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              {formData.image_url && (
                <div className="mt-4">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="mt-2 text-sm text-red-500"
                  >
                    Remove Image
                  </button>
                </div>
              )}
              <label
                htmlFor="image"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Select Image
              </label>
              <div className="mt-2">
                <input
                  id="image"
                  name="image"
                  type="file"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Description
              </label>
              <div className="mt-2">
                <textarea
                  id="description"
                  name="description"
                  type="text"
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm 
                  ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  }
                `}
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
                  "Edit"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
export default SelfEditEmployee;
