import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";

const Backend = getGlobalVariable();

function InputField({ id, label, type = "text", value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
      />
    </div>
  );
}

function EditEmployee() {
  const { eid, oeid } = useParams();
  const navigate = useNavigate();
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    mobile: "",
    salary: "",
    address: "",
    workpage: "other",
    password: "",
    image_url: "",
  });

  const workpageMapping = {
    product_management: `/product/${employeesData.pid}`,
    inventory_management: `/inventory/${employeesData.iid}`,
    sale_management: `/sale/${employeesData.sid}`,
    employee_management: `/employee/${eid}`,
    other: "",
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const token = localStorage.getItem("token");

      try {
        const response = await axios.get(
          `${Backend}/API/employee/one/${oeid}/`,
          {
            headers: { Authorization: `${token}` },
          }
        );

        const data = response.data;
        let updatedWorkpage = "other";

        if (data.workpage.includes("/product/"))
          updatedWorkpage = "product_management";
        else if (data.workpage.includes("/inventory/"))
          updatedWorkpage = "inventory_management";
        else if (data.workpage.includes("/sale/"))
          updatedWorkpage = "sale_management";
        else if (data.workpage.includes("/employee/"))
          updatedWorkpage = "employee_management";

        setFormData({
          name: data.name || "",
          description: data.description || "",
          email: data.email || "",
          mobile: data.mobile || "",
          salary: data.salary || "",
          address: data.address || "",
          workpage: updatedWorkpage,
          password: data.password || "",
          image_url: data.image_url || "",
        });
        setImagePreview(data.image_url);
      } catch (error) {
        console.error("Error fetching employee data:", error);
        setErrorMessage("Failed to fetch employee details.");
      }

      try {
        const employeesResponse = await axios.get(
          `${Backend}/API/employee/${eid}/`,
          {
            headers: { Authorization: `${token}` },
          }
        );
        setEmployeesData(employeesResponse.data);
      } catch (error) {
        console.error("Error fetching employees data:", error);
        setErrorMessage("Failed to fetch related employees data.");
      }

      setLoading(false);
    }

    fetchData();
  }, [oeid, eid]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        image_url: "",
      }));
      setImagePreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageRemove = () => {
    setFormData((prev) => ({ ...prev, imageFile: null, image_url: "" }));
    setImagePreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const token = localStorage.getItem("token");
    const updatedWorkpage =
      workpageMapping[formData.workpage] || formData.workpage;

    const formDataToSend = new FormData();
    Object.entries({ ...formData, workpage: updatedWorkpage }).forEach(
      ([key, value]) => {
        if (key !== "imageFile" || value) {
          formDataToSend.append(key, value);
        }
      }
    );

    if (formData.imageFile) {
      formDataToSend.append("image", formData.imageFile);
    }

    try {
      await axios.post(
        `${Backend}/API/employee/${oeid}/edit/`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `${token}`,
          },
        }
      );
      navigate(-1);
    } catch (err) {
      console.error("Error submitting form:", err.message);
      setErrorMessage("Failed to update employee details. Please try again.");
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
          Edit Employee
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorMessage && (
              <p className="text-red-500 text-sm">{errorMessage}</p>
            )}

            <InputField
              id="name"
              label="Name"
              value={formData.name}
              onChange={handleChange}
            />

            <InputField
              id="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            <InputField
              id="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />

            <div>
              <label
                htmlFor="workpage"
                className="block text-sm font-medium text-gray-900"
              >
                Work Page
              </label>
              <select
                id="workpage"
                name="workpage"
                value={formData.workpage}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
              >
                <option value="other">Other</option>
                <option value="product_management">Product Management</option>
                <option value="inventory_management">
                  Inventory Management
                </option>
                <option value="sale_management">Sale Management</option>
                <option value="employee_management">Employee Management</option>
              </select>
            </div>

            <InputField
              id="salary"
              label="Salary"
              type="number"
              value={formData.salary}
              onChange={handleChange}
            />

            <div>
              <label
                htmlFor="image"
                className="block text-sm font-medium text-gray-900"
              >
                Image
              </label>
              {imagePreview && (
                <div className="mb-4">
                  <img
                    src={imagePreview}
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
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
              />
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Edit Employee
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditEmployee;
