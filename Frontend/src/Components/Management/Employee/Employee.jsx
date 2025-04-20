import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
import OwnerHeader from "../../Owner/OwnerHeader";
import EmployeeHeader from "./EmployeeHeader";
import FiltersComponent from "./Utils/FiltersComponent";
import GeneralModal from "../../Utils/GeneralModal";

// Icons
import {
  PencilSquareIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

const Backend = getGlobalVariable();
const type = localStorage.getItem("type");

function Employee() {
  const { eid } = useParams();
  const [employeeData, setEmployeeData] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryFilter, setSalaryFilter] = useState({ min: "", max: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const navigate = useNavigate();

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${Backend}/API/employee/${eid}/`, {
          headers: { Authorization: token },
        });
        setEmployeeData(response.data.allEmployee);
        setFilteredEmployees(response.data.allEmployee);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchData();
  }, [eid]);

  // Filter logic
  useEffect(() => {
    let result = employeeData.filter((employee) =>
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (salaryFilter.min || salaryFilter.max) {
      result = result.filter((emp) => {
        const salary = emp.salary || 0;
        return (
          (!salaryFilter.min || salary >= salaryFilter.min) &&
          (!salaryFilter.max || salary <= salaryFilter.max)
        );
      });
    }
    setFilteredEmployees(result);
  }, [searchTerm, salaryFilter, employeeData]);

  const handleSearch = (term) => setSearchTerm(term);
  const handleSalaryFilter = (min, max) => setSalaryFilter({ min, max });

  const handleEmployeeDelete = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${Backend}/API/employee/${eid}/${employeeToDelete}/delete/`,
        {
          headers: { Authorization: token },
        }
      );
      setIsModalOpen(false);
      navigate(0); // Refresh
    } catch (error) {
      alert("Failed to delete employee.");
      console.error(error);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="container mx-auto p-4">
        {type === "owner" ? (
          <OwnerHeader Businessid={localStorage.getItem("bid")} />
        ) : (
          <EmployeeHeader
            employeeData={{
              id: localStorage.getItem("oeid"),
              workpage: localStorage.getItem("workpage") || null,
            }}
          />
        )}
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Employees</h2>
          <Link
            to={`/employee/${eid}/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add Employee
          </Link>
        </div>

        {/* Filters */}
        <FiltersComponent
          searchTerm={searchTerm}
          salaryFilter={salaryFilter}
          onSearch={handleSearch}
          onSalaryFilter={handleSalaryFilter}
          eid={eid}
        />

        {/* Employee List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 mt-6">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <div
                key={employee._id || employee.id}
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
              >
                <img
                  src={employee.image_url || "https://via.placeholder.com/150"}
                  alt={`${employee.name} profile`}
                  className="w-full h-32 object-cover rounded-md"
                />
                <h3 className="mt-3 text-lg font-semibold flex items-center gap-1">
                  <UserIcon className="h-5 w-5 text-gray-600" />
                  {employee.name}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p className="flex items-center gap-1">
                    <EnvelopeIcon className="h-4 w-4" />
                    <strong>Email:</strong> {employee.email}
                  </p>
                  <p className="flex items-center gap-1">
                    <PhoneIcon className="h-4 w-4" />
                    <strong>Phone:</strong> {employee.mobile}
                  </p>
                  <p className="flex items-center gap-1">
                    <CurrencyRupeeIcon className="h-4 w-4" />
                    <strong>Salary:</strong> ₹{employee.salary}
                  </p>
                  <p className="flex items-start gap-1">
                    <DocumentTextIcon className="h-4 w-4 mt-0.5" />
                    <strong>Description:</strong>{" "}
                    {employee.description || "N/A"}
                  </p>
                </div>

                <div className="mt-4 flex justify-between text-sm">
                  <Link
                    to={`/employee/${eid}/${employee._id}/edit`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      setEmployeeToDelete(employee._id);
                      setIsModalOpen(true);
                    }}
                    className="text-red-600 hover:underline flex items-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              No employees found.
            </p>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <GeneralModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        onConfirm={handleEmployeeDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}

export default Employee;
