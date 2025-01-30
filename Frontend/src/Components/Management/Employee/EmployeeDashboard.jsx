import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeHeader from "./EmployeeHeader";
import { getGlobalVariable } from "../../../globalVariables";
const Backend = getGlobalVariable();

function EmployeeDashboard() {
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/employee/data/one/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setEmployeeData(data);
        localStorage.setItem("oeid", data._id);
        if (data.workpage) {
          localStorage.setItem("workpage", data.workpage);
        }
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, []);

  return (
    <>
      {employeeData ? (
        <>
          <div className="container mx-auto p-4">
            <EmployeeHeader employeeData={employeeData} />
            <div className="bg-white shadow-lg rounded-lg p-8 w-full mt-12">
              <div className="flex justify-center mb-6">
                <img
                  src={employeeData.image_url}
                  alt={employeeData.name}
                  className="rounded-full w-32 h-32 shadow-lg"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                Welcome,{" "}
                <span className="text-blue-500">{employeeData.name}</span>
              </h1>
              <div className="bg-gray-100 p-4 rounded-md w-full mb-8">
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Email:</span>{" "}
                  {employeeData.email}
                </p>
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Mobile:</span>{" "}
                  {employeeData.mobile}
                </p>
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Address:</span>{" "}
                  {employeeData.address}
                </p>
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Description:</span>{" "}
                  {employeeData.description}
                </p>
                <p className="text-gray-800 text-lg">
                  <span className="font-semibold">Salary:</span> ₹
                  {employeeData.salary}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500">Loading...</p>
      )}
    </>
  );
}

export default EmployeeDashboard;
