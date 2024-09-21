import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function BusinessCard({ id }) {
  const [businessData, setBusinessData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/owner/business/data/${id}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setBusinessData(data);
      } catch (error) {
        alert(error);
      }
    }
    getData();
  }, [id]);

  return (
    <>
      {businessData ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">{businessData.name}</h2>
          <p className="text-gray-700 mb-4">{businessData.description}</p>
          <div className="mb-4">
            <p>
              <strong>Assets:</strong> {businessData.assets}
            </p>
            <p>
              <strong>Profit:</strong> {businessData.profit}
            </p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Manage Your Business</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to={`/employee/${businessData.employee}`}
                  className="text-blue-500 hover:underline"
                >
                  Employee Management
                </Link>
              </li>
              <li>
                <Link
                  to={`/product/${businessData.product}`}
                  className="text-blue-500 hover:underline"
                >
                  Product Management
                </Link>
              </li>
              <li>
                <Link
                  to={`/inventory/${businessData.inventory}`}
                  className="text-blue-500 hover:underline"
                >
                  Inventory Management
                </Link>
              </li>
              <li>
                <Link
                  to={`/sale/${businessData.sale}`}
                  className="text-blue-500 hover:underline"
                >
                  Sale Management
                </Link>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
}

export default BusinessCard;
