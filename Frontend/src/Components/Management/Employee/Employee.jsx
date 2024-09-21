import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function Employee() {
  let { eid } = useParams();
  const [employeeData, setEmployeeData] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // State for the search input
  const [filteredEmployees, setFilteredEmployees] = useState([]); // State for the filtered employee list
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const employeeResponse = await axios.get(`/API/employee/${eid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        const allEmployees = employeeResponse.data.allEmployee;
        setEmployeeData(allEmployees);
        setFilteredEmployees(allEmployees); // Set filtered employees to all by default
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [eid]);

  // Handle search input change
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);

    // Filter employees by name based on search input
    if (e.target.value === "") {
      setFilteredEmployees(employeeData); // Show all employees when search is cleared
    } else {
      const filtered = employeeData.filter((employee) =>
        employee.name.toLowerCase().includes(e.target.value.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  };

  const handleEmployeeDelete = async (oeid) => {
    let token = localStorage.getItem("token");

    try {
      await axios.delete(`/API//employee/${eid}/${oeid}/delete/`, {
        headers: {
          Authorization: `${token}`,
        },
      });
      navigate(0);
    } catch (error) {
      alert(error);
    }
  };

  return (
    <>
      <Link
        to={`/employee/${eid}/new`}
        className="focus:outline-none text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-orange-400 dark:hover:bg-orange-500 dark:focus:ring-orange-700 mt-6"
      >
        Add New Employee
      </Link>

      {/* Search Bar */}
      <div className="max-w-5xl mx-auto p-4">
        <input
          type="text"
          placeholder="Search employees by name..."
          value={searchTerm}
          onChange={handleSearch}
          className="mb-6 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <h2 className="text-2xl font-bold mb-6">Employee List</h2>

        {/* Employee List */}
        {filteredEmployees && filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEmployees.map((employee, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-300 rounded-lg shadow-md p-4 text-center h-64" // Adjusted height
              >
                {/* Employee Photo */}
                <img
                  src={
                    employee.image_url ||
                    "https://res.cloudinary.com/dj8k222gy/image/upload/v1726899879/Profile_picture_hhfxmt.webp"
                  }
                  alt={employee.name}
                  className="w-20 h-20 rounded-full mx-auto"
                />

                <h3 className="text-sm font-semibold text-gray-800 mt-2">
                  {employee.name}
                </h3>
                <p className="text-xs text-gray-600 mt-1">{employee.email}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Salary: ₹{employee.salary}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Mobile: {employee.mobile}
                </p>
                {/* New Description Field */}
                <p className="text-xs text-gray-600 mt-1">
                  Description:{" "}
                  {employee.description
                    ? employee.description
                    : "No description available."}
                </p>

                {/* Edit and Delete buttons */}
                <div className="mt-3 flex justify-center space-x-2">
                  <Link
                    to={`/employee/${eid}/${employee._id}/edit`}
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleEmployeeDelete(employee._id)}
                    className="text-red-500 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No employees found.</p>
        )}
      </div>
    </>
  );
}

export default Employee;
