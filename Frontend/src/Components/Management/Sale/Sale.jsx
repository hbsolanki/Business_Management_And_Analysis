import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import OwnerHeader from "../../Owner/OwnerHeader";
import EmployeeHeader from "../Employee/EmployeeHeader";
import { getGlobalVariable } from "../../../globalVariables";
const Backend = getGlobalVariable();
const type = localStorage.getItem("type");

function Sale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [filteredSaleData, setFilteredSaleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(""); // State for start date
  const [endDate, setEndDate] = useState(""); // State for end date

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/sale/${sid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setSaleData(data);
        setFilteredSaleData(data.saleInfo); // Set the filtered data initially
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [sid]);

  const handleFilterChange = () => {
    if (!startDate || !endDate) {
      setFilteredSaleData(saleData.saleInfo);
      return;
    }

    const filteredData = saleData.saleInfo.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
    setFilteredSaleData(filteredData);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Sort the filteredSaleData by date in descending order
  const sortedSaleData = filteredSaleData
    ? filteredSaleData.sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <>
      <div className="container mx-auto p-4">
        {/* Header */}
        {type == "owner" ? (
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Sales Information
          </h1>
          <Link
            to={`/sale/${sid}/new`}
            className="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
          >
            New Sale Input
          </Link>
        </div>

        {/* Date Filter Section */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <div>
              {" "}
              Start{" "}
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border px-4 py-2 rounded"
              />
            </div>
            <div>
              End{" "}
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border px-4 py-2 rounded"
              />
            </div>
            <button
              onClick={handleFilterChange}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center">
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
        ) : sortedSaleData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedSaleData.map((sale) => (
              <div
                key={sale._id}
                className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 transition-transform duration-300 hover:shadow-xl"
              >
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  Sale Data (ID: {sale._id})
                </h2>
                <div>
                  <p className="font-medium text-gray-800">
                    Total Revenue:{" "}
                    {formatCurrency(sale.totalRevenueFromProduct)}
                  </p>
                  <p className="font-medium text-gray-800">
                    Total Cost: {formatCurrency(sale.COGS)}
                  </p>
                  <p className="font-medium text-gray-800">
                    Marketing Cost: {formatCurrency(sale.marketing)}
                  </p>
                  <p className="font-medium text-gray-800">
                    Other Costs: {formatCurrency(sale.othercost)}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong className="text-gray-800 font-bold">Date: </strong>
                    {new Date(sale.date).toLocaleDateString()}{" "}
                    {new Date(sale.date).toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
                <h3 className="font-semibold mt-4 text-gray-800">Products:</h3>
                <ul className="list-disc pl-5">
                  {sale.allProductSale.map((product, idx) => {
                    const productName = Object.keys(product)[0];
                    return (
                      <li key={idx} className="mb-2 text-gray-700">
                        <strong>{productName}:</strong> Sold{" "}
                        {product[productName]} units | Cost:{" "}
                        {formatCurrency(product.cost)} | Revenue:{" "}
                        {formatCurrency(product.revenue)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No sale data available.</p>
        )}
      </div>
    </>
  );
}

export default Sale;
