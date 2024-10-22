import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import OwnerHeader from "./OwnerHeader";
import EmployeeHeader from "../Management/Employee/EmployeeHeader";
import { decodedTokenAndGetInfo } from "../Auth/auth";
import { getGlobalVariable } from "../../globalVariables";
const Backend = getGlobalVariable();

function Owner() {
  const [ownerData, setOwnerData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/owner/home/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setOwnerData(data);
        if (data.businessid) {
          const response2 = await axios.get(
            `${Backend}/API/owner/business/data/${data.businessid}/`,
            {
              headers: {
                Authorization: `${token}`,
              },
            }
          );
          const data2 = response2.data;
          setBusinessData(data2);
        }
      } catch (error) {
        try {
          const response = await axios.get(
            `${Backend}/API/employee/data/one/`,
            {
              headers: {
                Authorization: `${token}`,
              },
            }
          );
          const data = response.data;
          console.log(data);
          setEmployeeData(data);
        } catch (error) {
          alert(error);
        }
      }
    }
    getData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      {ownerData ? (
        <>
          <OwnerHeader ownerData={ownerData} />
          <div className="bg-white shadow-lg rounded-lg p-8 w-full mt-12">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Welcome, <span className="text-blue-500">{ownerData.name}</span>
            </h1>
            <div className="bg-gray-100 p-4 rounded-md w-full mb-8">
              <p className="text-gray-800 text-lg">
                <span className="font-semibold">Email:</span> {ownerData.email}
              </p>
              <p className="text-gray-800 text-lg">
                <span className="font-semibold">Mobile:</span>{" "}
                {ownerData.mobile_number}
              </p>
            </div>

            {ownerData.businessid ? (
              <div className="mt-8 w-full">
                {businessData ? (
                  <div className="bg-white shadow-md rounded-lg p-6 w-full">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      {businessData.name}
                    </h2>
                    <p className="text-gray-700 mb-6 text-lg">
                      {businessData.description}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <p>
                        <strong>Assets:</strong> {businessData.assets}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">
                        Manage Your Business
                      </h3>
                      <ul className="grid grid-cols-1 gap-4">
                        <li>
                          <Link
                            to={`/employee/${businessData.employee}`}
                            className="block bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm text-center transition-all duration-300 hover:bg-blue-50 hover:shadow-md"
                          >
                            <p className="text-gray-700 font-semibold">
                              Employee Management
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            to={`/product/${businessData.product}`}
                            className="block bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm text-center transition-all duration-300 hover:bg-blue-50 hover:shadow-md"
                          >
                            <p className="text-gray-700 font-semibold">
                              Product Management
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            to={`/inventory/${businessData.inventory}`}
                            className="block bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm text-center transition-all duration-300 hover:bg-blue-50 hover:shadow-md"
                          >
                            <p className="text-gray-700 font-semibold">
                              Inventory Management
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            to={`/sale/${businessData.sale}`}
                            className="block bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm text-center transition-all duration-300 hover:bg-blue-50 hover:shadow-md"
                          >
                            <p className="text-gray-700 font-semibold">
                              Sale Management
                            </p>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  ""
                )}
              </div>
            ) : (
              <Link
                to="/owner/business/new"
                className="mt-8 block bg-blue-500 text-white py-3 px-6 rounded-lg w-full text-center shadow-md"
              >
                Create Business
              </Link>
            )}
          </div>
        </>
      ) : (
        ""
      )}
      {employeeData ? (
        <>
          {" "}
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

export default Owner;
