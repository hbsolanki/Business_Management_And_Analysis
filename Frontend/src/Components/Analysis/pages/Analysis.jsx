import { useState, useEffect } from "react";
import Piechart from "../charts/Piechart";
import Linechart from "../charts/Linechart";
import Barsize from "../charts/Barsize";
import ProductSell from "../charts/ProductSell";
import Productmnf from "../charts/Productmnf";
import ProductStock from "../charts/ProductStock";
import IMG1 from "../../../assets/VISIONARY.png";
import axios from "axios";

import { useParams } from "react-router-dom";

function Analysis() {
  let { bid } = useParams();
  const [turnoverData, setTurnoverData] = useState(null);
  const [turnoverTenmonthData, setTurnoverTenmonthData] = useState(null);
  const [netprofitTenmonthData, setNetprofitTenmonthData] = useState(null);
  const [productStockData, setProductStockData] = useState(null);
  const [productDetailsData, setProductDetailsData] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const responseData1 = await axios.get(`/API/analysis/${bid}/turnover/`);
        // console.log(responseData1.data);
        setTurnoverData(responseData1.data);

        const responseData2 = await axios.get(
          `/API/analysis/${bid}/product/stock/`
        );
        console.log(responseData2.data);
        setProductStockData(responseData2.data);
      } catch (err) {
        console.log(err);
      }
    };
    getData();
  }, []);

  return (
    <>
      <div className="bg-gray-100 min-h-screen p-4">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-lg mb-6 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Logo/Brand Name */}
              <div className="text-2xl font-bold text-gray-800">
                <img src={IMG1} alt="" height={70} width={70} />
              </div>
              {/* Navigation Links */}
              <div className="hidden sm:flex space-x-6">
                {[
                  "Turnover",
                  "NetProfit",
                  "ProductAnalysis",
                  "SellingAnalysis",
                  "StockAnalysis",
                ].map((item) => (
                  <a
                    href={`#${item}`}
                    key={item}
                    className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  >
                    {item}
                  </a>
                ))}
              </div>
              {/* Mobile Menu */}
              <div className="sm:hidden flex items-center">
                <button
                  className="text-gray-600 hover:text-gray-800 focus:outline-none focus:text-gray-800"
                  aria-label="Menu"
                >
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto">
          <div className="grid grid-cols-1 gap-6">
            {/* Company Turnover */}
            <h1
              id="Turnover"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Company Turnover
            </h1>
            {turnoverData ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <Piechart Data={turnoverData} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Total Turnover Distribution
                </p>
              </div>
            ) : (
              ""
            )}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <Linechart />
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Last 10 Month Company Turnover
              </p>
            </div>

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Company NetProfit */}
            <h1
              id="NetProfit"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Company NetProfit
            </h1>
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <Linechart />
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Last 10 Month Company NetProfit
              </p>
            </div>

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Product Analysis */}
            <h1
              id="ProductAnalysis"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Product Analysis
            </h1>
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <Barsize />
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Mnf & Profit Distribution
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <Productmnf />
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Manufacturing Per Month
              </p>
            </div>

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Product Selling Analysis */}
            <h1
              id="SellingAnalysis"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Product Selling Analysis
            </h1>
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <ProductSell />
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Sold Per Month
              </p>
            </div>

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Stock Analysis */}
            <h1
              id="StockAnalysis"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Stock Analysis
            </h1>
            {productStockData ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <ProductStock Data={productStockData} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Current Month Product's Stock
                </p>
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Analysis;
