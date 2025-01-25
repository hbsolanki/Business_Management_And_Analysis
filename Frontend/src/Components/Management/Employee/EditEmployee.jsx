import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";

const Backend = getGlobalVariable();

function EditEmployee() {
  const { eid, oeid } = useParams();
  const navigate = useNavigate();
  const [employeesData, setEmployeesData] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    mobile: "",
    salary: "",
    address: "",
    workpage: "",
    password: "",
    image: null,
  });

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");

      try {
        // Fetching employee data
        const response = await axios.get(
          `${Backend}/API/employee/one/${oeid}/`,
          {
            headers: { Authorization: `${token}` },
          }
        );
        let data = response.data;

        // Check the current workpage and convert it to the corresponding string
        let updatedWorkpage = "";
        switch (true) {
          case data.workpage.includes("/product/"):
            updatedWorkpage = "product_management";
            break;
          case data.workpage.includes("/inventory/"):
            updatedWorkpage = "inventory_management";
            break;
          case data.workpage.includes("/sale/"):
            updatedWorkpage = "sale_management";
            break;
          case data.workpage.includes("/employee/"):
            updatedWorkpage = "employee_management";
            break;
          default:
            updatedWorkpage = ""; // Reset if no match
        }

        // Update formData state with the correct workpage
        setFormData({
          name: data.name || "",
          description: data.description || "",
          email: data.email || "",
          mobile: data.mobile || "",
          salary: data.salary || "",
          address: data.address || "",
          workpage: updatedWorkpage, // Ensure workpage is updated
          password: data.password || "",
          image: null,
        });
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }

      try {
        // Fetching employees data
        const employeesResponse = await axios.get(
          `${Backend}/API/employee/${eid}/`,
          {
            headers: { Authorization: `${token}` },
          }
        );
        setEmployeesData(employeesResponse.data);
      } catch (error) {
        console.error("Error fetching employees data:", error);
      }
    }

    fetchData();
  }, [oeid, eid]);

  const resetWorkpage = () => {
    // Create a new object for updating formData
    const updatedFormData = { ...formData };

    // Check the current workpage and convert it to the corresponding string
    switch (true) {
      case formData.workpage.includes("/product/"):
        updatedFormData.workpage = "product_management";
        break;
      case formData.workpage.includes("/inventory/"):
        updatedFormData.workpage = "inventory_management";
        break;
      case formData.workpage.includes("/sale/"):
        updatedFormData.workpage = "sale_management";
        break;
      case formData.workpage.includes("/employee/"):
        updatedFormData.workpage = "employee_management";
        break;
      default:
        updatedFormData.workpage = ""; // Reset if no match
    }

    // Update the state with the modified formData
    setFormData(updatedFormData);
  };

  const workpageMapping = {
    product_management: `/product/${employeesData.pid}`,
    inventory_management: `/inventory/${employeesData.iid}`,
    sale_management: `/sale/${employeesData.sid}`,
    employee_management: `/employee/${eid}`,
    other: "",
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    // Update workpage directly in the form data object
    const updatedWorkpage =
      workpageMapping[formData.workpage] || formData.workpage;

    const formDataToSend = new FormData();
    Object.entries({ ...formData, workpage: updatedWorkpage }).forEach(
      ([key, value]) => {
        formDataToSend.append(key, value);
      }
    );

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
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Edit Employee
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </div>

          {/* Work Page Dropdown */}
          <div>
            <label
              htmlFor="workpage"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Work Page
            </label>
            <select
              id="workpage"
              name="workpage"
              value={formData.workpage}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            >
              <option value="other">Other</option>
              <option value="product_management">Product Management</option>
              <option value="inventory_management">Inventory Management</option>
              <option value="sale_management">Sale Management</option>
              <option value="employee_management">Employee Management</option>
            </select>
          </div>

          {/* Salary Field */}
          <div>
            <label
              htmlFor="salary"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Salary
            </label>
            <input
              id="salary"
              name="salary"
              type="number"
              value={formData.salary}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </div>

          {/* Image Field */}
          <div>
            <label
              htmlFor="image"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Image
            </label>
            <input
              id="image"
              name="image"
              type="file"
              onChange={handleChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Edit Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEmployee;
