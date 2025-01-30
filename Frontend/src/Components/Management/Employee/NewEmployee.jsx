import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
const Backend = getGlobalVariable();

function NewEmployee() {
  let { eid } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(false); // Track loading state

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const employeeResponse = await axios.get(
          `${Backend}/API/employee/${eid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );

        setEmployeesData(employeeResponse.data);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [eid]);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading state to true on form submission

    const token = localStorage.getItem("token");
    let updatedFormData = { ...formData };

    // Determine the correct workpage URL
    switch (formData.workpage) {
      case "product_management":
        updatedFormData.workpage = `/product/${employeesData.pid}`;
        break;
      case "inventory_management":
        updatedFormData.workpage = `/inventory/${employeesData.iid}`;
        break;
      case "sale_management":
        updatedFormData.workpage = `/sale/${employeesData.sid}`;
        break;
      case "employee_management":
        updatedFormData.workpage = `/employee/${eid}`;
        break;
      default:
        updatedFormData.workpage = "";
    }

    try {
      await axios.post(`${Backend}/API/employee/${eid}/new/`, updatedFormData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
      });

      navigate(-1); // Navigate back after successful submission
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false); // Reset loading state to false after the request
    }
  };

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Add Employee
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
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="salary"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Salary
              </label>
              <div className="mt-2">
                <input
                  id="salary"
                  name="salary"
                  type="number"
                  onChange={handleChange}
                  required
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
                  onChange={handleChange}
                  required
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
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

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
                value={formData.workpage || "No"} // Ensure a default value
                onChange={handleChange}
                required={true}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value="No">NO</option>
                <option value="inventory_management">
                  Inventory Management
                </option>
                <option value="sale_management">Sale Management</option>
                <option value="employee_management">Employee Management</option>
                <option value="product_management">Product Management</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading} // Disable the button while loading
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
                  "Add Employee"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default NewEmployee;
