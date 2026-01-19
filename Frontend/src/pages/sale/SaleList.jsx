import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { saleService } from "@/features/sale/services/saleService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";

// Icons
import {
  FaRupeeSign,
  FaChartLine,
  FaBullhorn,
  FaMoneyBillWave,
  FaBoxOpen,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

function Sale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [filteredSaleData, setFilteredSaleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function getData() {
      try {
        const response = await saleService.getById(sid);
        const data = response.data;
        setSaleData(data);
        setFilteredSaleData(data.saleInfo);
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

  const sortedSaleData = filteredSaleData
    ? filteredSaleData.sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  return (
    <>
      <ProtectedHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Sales Information
            </h1>
            <p className="text-gray-500 mt-1">View and manage sales records</p>
          </div>

          <Link
            to={`/sale/${sid}/new`}
            className="
            inline-flex items-center gap-2
            bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
            text-white font-medium
            px-5 py-2.5
            rounded-lg
            shadow-lg shadow-blue-500/30
            hover:scale-[1.02] transform transition-all
            "
          >
            <FaChartLine className="h-5 w-5" />
            New Sale Input
          </Link>
        </div>

        {/* Date Filter Section */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <div>
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

        {/* Sales Cards */}
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
                <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-500" />
                  {new Date(sale.date).toLocaleDateString()}
                  <span className="ml-4 flex items-center gap-2">
                    <FaClock className="text-blue-500" />
                    {new Date(sale.date).toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </h2>

                <div className="space-y-2">
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    <FaChartLine className="text-green-600" />
                    Total Revenue:{" "}
                    {formatCurrency(sale.totalRevenueFromProduct)}
                  </p>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    <FaRupeeSign className="text-red-500" />
                    Total Cost: {formatCurrency(sale.COGS)}
                  </p>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    <FaBullhorn className="text-orange-500" />
                    Marketing Cost: {formatCurrency(sale.marketing)}
                  </p>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    <FaMoneyBillWave className="text-purple-500" />
                    Other Costs: {formatCurrency(sale.othercost)}
                  </p>
                </div>

                <h3 className="font-semibold mt-4 text-gray-800 flex items-center gap-2">
                  <FaBoxOpen className="text-indigo-600" />
                  Products:
                </h3>
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
