import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeHeader from "./EmployeeHeader";
function EmployeeDashboard() {
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/employee/data/one/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setEmployeeData(data);
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      {employeeData ? (
        <>
          <div className="container mx-auto p-4">
            <EmployeeHeader employeeData={employeeData} />
            <div className="bg-white shadow-lg rounded-lg p-8 w-full mt-12">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                Welcome,{" "}
                <span className="text-blue-500">{employeeData.name}</span>
              </h1>
              <div className="bg-gray-100 p-4 rounded-md w-full mb-8">
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Email:</span>{" "}
                  {employeeData.email}
                </p>
                {employeeData.mobile_number ? (
                  <p className="text-gray-800 text-lg">
                    <span className="font-semibold">Mobile:</span>{" "}
                  </p>
                ) : (
                  ""
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        ""
      )}
    </div>
  );
}

export default EmployeeDashboard;
