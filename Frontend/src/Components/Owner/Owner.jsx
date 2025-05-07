import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import OwnerHeader from "./OwnerHeader";
import { getGlobalVariable } from "../../globalVariables";
import {
  FaUser,
  FaEdit,
  FaBuilding,
  FaCog,
  FaUsers,
  FaProductHunt,
  FaBoxOpen,
  FaCashRegister,
} from "react-icons/fa"; // Importing icons

const Backend = getGlobalVariable();

function Owner() {
  const [ownerData, setOwnerData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      const token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/owner/home/`, {
          headers: { Authorization: `${token}` },
        });
        const data = response.data;
        setOwnerData(data);
        console.log(data);

        if (data.businessid) {
          localStorage.setItem("bid", data.businessid);
          const businessResponse = await axios.get(
            `${Backend}/API/owner/business/data/${data.businessid}/`,
            {
              headers: { Authorization: `${token}` },
            }
          );
          setBusinessData(businessResponse.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response?.status === 401) {
          alert("Session expired. Please log in again.");
          navigate("/login");
        } else {
          alert("Error fetching data. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {ownerData ? (
        <>
          <OwnerHeader Businessid={ownerData.businessid} />
          <div className="bg-white shadow-lg rounded-lg p-8 w-full mt-12">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Welcome, <span className="text-blue-500">{ownerData.name}</span>
            </h1>
            <div className="bg-gray-100 p-6 rounded-md w-full mb-8">
              <p className="text-gray-800 text-lg">
                <span className="font-semibold">Email:</span> {ownerData.email}
              </p>
              <p className="text-gray-800 text-lg">
                <span className="font-semibold">Mobile:</span>{" "}
                {ownerData.mobile_number}
              </p>
              <div className="mt-4">
                <Link
                  className="mt-4 text-white bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300"
                  to={"/owner/edit"}
                >
                  <FaEdit className="inline mr-2" /> Edit Profile Details
                </Link>
              </div>
            </div>

            {ownerData.businessid ? (
              businessData ? (
                <div className="mt-8 w-full">
                  <div className="bg-gray-100 p-6 rounded-md w-full mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      <FaBuilding className="inline mr-2" />
                      {businessData.name || "Unnamed Business"}
                    </h2>
                    <p className="text-gray-700 mb-6 text-lg">
                      {businessData.description || "No description available."}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <p className="text-gray-800">
                        <strong>Assets:</strong>{" "}
                        {businessData.assets || "Not specified"}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Link
                        to={`/owner/business/edit/${ownerData.businessid}`}
                        className=" text-white bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300 inline-flex items-center"
                      >
                        <FaEdit className="mr-2" />
                        Edit Business Details
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      Manage Your Business
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          title: "Employee Management",
                          link: `/employee/${businessData.employee}`,
                          icon: <FaUsers className="mr-2 text-blue-500" />,
                        },
                        {
                          title: "Product Management",
                          link: `/product/${businessData.product}`,
                          icon: (
                            <FaProductHunt className="mr-2 text-blue-500" />
                          ),
                        },
                        {
                          title: "Inventory Management",
                          link: `/inventory/${businessData.inventory}`,
                          icon: <FaBoxOpen className="mr-2 text-blue-500" />,
                        },
                        {
                          title: "Sale Management",
                          link: `/sale/${businessData.sale}`,
                          icon: (
                            <FaCashRegister className="mr-2 text-blue-500" />
                          ),
                        },
                      ].map((item, index) => (
                        <li key={index} className="text-center">
                          <Link
                            to={item.link}
                            className="block bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm text-center transition-all duration-300 hover:bg-blue-50 hover:shadow-md"
                          >
                            <div className="flex items-center justify-center">
                              {item.icon}
                              <p className="text-gray-700 font-semibold">
                                {item.title}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">
                  Loading business data. Please wait...
                </p>
              )
            ) : (
              <Link
                to="/owner/business/new"
                className="mt-8 block bg-blue-500 text-white py-3 px-6 rounded-lg w-full text-center shadow-md hover:bg-blue-600 transition-all duration-300"
              >
                <FaBuilding className="inline mr-2" />
                Create Business
              </Link>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500">Loading...</p>
      )}
    </div>
  );
}

export default Owner;
