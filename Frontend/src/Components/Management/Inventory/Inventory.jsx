import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Inventory() {
  let { iid } = useParams();
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/inventory/${iid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setInventoryData(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [iid]);

  const renderProductDetails = (product) => {
    const productDetails = Object.entries(product).filter(
      ([key]) => key !== "_id" && key !== "date"
    );

    return productDetails.map(([productName, quantity], idx) => (
      <p key={idx} className="mt-2">
        <span className="font-bold">{productName}</span>: {quantity}
      </p>
    ));
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Inventory</h2>
            <Link
              to={`/inventory/${iid}/new`}
              className="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
            >
              New Inventory
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventoryData.stock.map((stockEntry, idx) => (
              <article
                key={idx}
                className="border border-gray-300 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Stock Entry
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Date: {new Date(stockEntry.date).toLocaleString()}
                </p>
                <div className="text-sm text-gray-700">
                  {renderProductDetails(stockEntry)}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default Inventory;
