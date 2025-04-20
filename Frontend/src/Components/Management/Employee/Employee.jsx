import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
import OwnerHeader from "../../Owner/OwnerHeader";
import EmployeeHeader from "./EmployeeHeader";
import FiltersComponent from "./Utils/FiltersComponent";
import GeneralModal from "../../Utils/GeneralModal";

const Backend = getGlobalVariable();
const type = localStorage.getItem("type");

function Employee() {
  let { eid } = useParams();
  const [employeeData, setEmployeeData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryFilter, setSalaryFilter] = useState({ min: "", max: "" });
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [employeeToDelete, setEmployeeToDelete] = useState(null); // Selected employee to delete
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/employee/${eid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        if (isMounted) {
          setEmployeeData(response.data.allEmployee);
          setFilteredEmployees(response.data.allEmployee);
          console.log(response.data);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    }

    getData();

    return () => {
      isMounted = false;
    };
  }, [eid]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleSalaryFilter = (min, max) => {
    setSalaryFilter({ min, max });
  };

  useEffect(() => {
    let filtered = employeeData.filter((employee) =>
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (salaryFilter.min || salaryFilter.max) {
      filtered = filtered.filter((employee) => {
        const salary = employee.salary || 0;
        return (
          (!salaryFilter.min || salary >= salaryFilter.min) &&
          (!salaryFilter.max || salary <= salaryFilter.max)
        );
      });
    }

    setFilteredEmployees(filtered);
  }, [searchTerm, salaryFilter, employeeData]);

  const handleEmployeeDelete = async () => {
    let token = localStorage.getItem("token");

    try {
      await axios.delete(
        `${Backend}/API/employee/${eid}/${employeeToDelete}/delete/`,
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );
      setIsModalOpen(false); // Close modal after deletion
      navigate(0); // Refresh the page
    } catch (error) {
      alert("Failed to delete employee. Please try again.");
      console.error(error);
    }
  };

  return (
    <>
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
      {employeeData.length ? (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <FiltersComponent
              searchTerm={searchTerm}
              salaryFilter={salaryFilter}
              onSearch={handleSearch}
              onSalaryFilter={handleSalaryFilter}
              eid={eid}
            />
            {/* Employee List Component */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee._id || employee.id} // Use a unique key
                    className="flex flex-col bg-white p-4 rounded-lg shadow-md hover:shadow-lg"
                  >
                    {console.log(employee)}
                    <img
                      src={
                        employee.image_url || "https://via.placeholder.com/150"
                      }
                      alt={`${employee.name} profile picture`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <h3 className="text-lg font-semibold mt-2">
                      {employee.name}
                    </h3>
                    <div className="mt-2 text-sm">
                      <p>
                        <strong>Email:</strong> {employee.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {employee.mobile}
                      </p>
                      <p>
                        <strong>Salary:</strong> ₹{employee.salary}
                      </p>
                      <p>
                        <strong>Description:</strong> {employee.description}
                      </p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Link
                        to={`/employee/${eid}/${employee._id}/edit`}
                        className="text-blue-500 font-medium text-sm"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          setEmployeeToDelete(employee._id);
                          setIsModalOpen(true); // Open modal to confirm deletion
                        }}
                        className="text-red-500 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center">
                  No employees found.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center items-center">
            <p className="text-gray-600">Loading ...</p>
          </div>
        </>
      )}

      {/* General Modal for Deletion Confirmation */}
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
