import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import BusinessCard from "../Business/BusinessCard";

function OwnerDashboard() {
  const [ownerData, setOwnerData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/owner/home/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setOwnerData(data);
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      {ownerData ? (
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-4">
            Welcome, <span className="text-blue-600">{ownerData.name}</span>
          </h1>
          <p className="text-gray-600">
            <span className="font-semibold">Email:</span> {ownerData.email}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Mobile:</span>{" "}
            {ownerData.mobile_number}
          </p>

          {ownerData.businessid ? (
            <div className="mt-6">
              <BusinessCard id={ownerData.businessid} />
            </div>
          ) : (
            <Link
              to="/owner/business/new"
              className="mt-6 inline-block bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
            >
              Create Business
            </Link>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">Loading...</p>
      )}
    </div>
  );
}

export default OwnerDashboard;
