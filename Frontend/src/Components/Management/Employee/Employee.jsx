import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function Employee() {
  let { eid } = useParams();
  const [employeeData, setEmployeeData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
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
        setFilteredEmployees(allEmployees);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [eid]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);

    if (e.target.value === "") {
      setFilteredEmployees(employeeData);
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
      await axios.delete(`/API/employee/${eid}/${oeid}/delete/`, {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <input
            type="text"
            placeholder="Search employees by name..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full sm:w-2/3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Link
            to={`/employee/${eid}/new`}
            className="mt-4 sm:mt-0 sm:ml-4 text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
          >
            Add New Employee
          </Link>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-6">Employee List</h2>

        {filteredEmployees && filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-transform duration-300 ease-in-out transform hover:scale-105"
              >
                <img
                  src={
                    employee.image_url ||
                    "https://res.cloudinary.com/dj8k222gy/image/upload/v1726899879/Profile_picture_hhfxmt.webp"
                  }
                  alt={employee.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />

                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {employee.name}
                </h3>
                <p className="text-gray-600">{employee.email}</p>
                <p className="text-gray-700 mt-2 font-medium">
                  Salary: ₹{employee.salary}
                </p>
                <p className="text-gray-600 mt-1">Mobile: {employee.mobile}</p>
                <p className="text-gray-600 mt-2">
                  Description:{" "}
                  {employee.description
                    ? employee.description
                    : "No description available."}
                </p>

                <div className="mt-4 flex justify-center space-x-4">
                  <Link
                    to={`/employee/${eid}/${employee._id}/edit`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleEmployeeDelete(employee._id)}
                    className="text-red-600 hover:underline text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No employees found.</p>
        )}
      </div>
    </>
  );
}

export default Employee;
