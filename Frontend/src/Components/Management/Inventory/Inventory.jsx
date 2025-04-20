import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import OwnerHeader from "../../Owner/OwnerHeader";
import EmployeeHeader from "../Employee/EmployeeHeader";
import { getGlobalVariable } from "../../../globalVariables";

// Icons
import {
  FaWarehouse,
  FaBoxes,
  FaPlusCircle,
  FaCalendarAlt,
  FaBoxOpen,
  FaSearch,
  FaTimesCircle,
} from "react-icons/fa";

const Backend = getGlobalVariable();
const type = localStorage.getItem("type");

function Inventory() {
  let { iid } = useParams();
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    async function getData() {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${Backend}/API/inventory/${iid}/`, {
          headers: { Authorization: `${token}` },
        });
        setInventoryData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [iid]);

  const renderProductDetails = (product) => {
    const productDetails = Object.entries(product || {}).filter(
      ([key]) => key !== "_id" && key !== "date"
    );

    return productDetails.map(([productName, quantity], idx) => (
      <p key={idx} className="mt-2">
        <FaBoxOpen className="inline text-indigo-600 mr-2" />
        <span className="font-bold">{productName}</span>: {quantity}
      </p>
    ));
  };

  const filteredStockEntries = inventoryData?.stock
    .filter((entry) => entry.date.includes(searchDate))
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sorting by date descending

  return (
    <>
      <div className="container mx-auto p-4">
        {/* Header */}
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
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FaWarehouse className="text-blue-600" />
              Inventory
            </h2>
          </div>

          {/* Available Stock */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaBoxes className="text-green-600" />
              Available Stock
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryData?.productStock?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <p className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <FaBoxOpen className="text-indigo-500" />
                    {item.product}
                  </p>
                  <p className="text-sm text-gray-600">
                    Stock: {item.quantity}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Entries */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <FaSearch className="text-gray-600" />
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setSearchDate("")}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md flex items-center gap-1"
                >
                  <FaTimesCircle />
                  Clear
                </button>
              </div>
              <Link
                to={`/inventory/${iid}/new`}
                className="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition flex items-center gap-2"
              >
                <FaPlusCircle />
                New Inventory
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStockEntries?.map((stockEntry, idx) => (
                <article
                  key={stockEntry._id || idx}
                  className="border border-gray-300 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                >
                  <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-500" />
                    {new Date(stockEntry.date).toLocaleString()}
                  </p>
                  <div className="text-sm text-gray-700">
                    {renderProductDetails(stockEntry)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Inventory;
