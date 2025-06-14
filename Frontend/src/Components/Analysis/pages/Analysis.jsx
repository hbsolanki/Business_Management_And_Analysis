import { useState, useEffect } from "react";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
import AnalysisHeader from "./AnalysisHeader";
import Piechart from "../charts/Piechart";
import Linechart from "../charts/Linechart";
import Barsize from "../charts/Barsize";
import ProductSell from "../charts/ProductSell";
import Productmnf from "../charts/Productmnf";
import ProductStock from "../charts/ProductStock";
import { useParams, useNavigate } from "react-router-dom";

// Retrieve the backend URL from the global variables
const Backend = getGlobalVariable();

function Analysis() {
  let { bid } = useParams();
  const navigate = useNavigate();
  const [turnoverData, setTurnoverData] = useState(null);
  const [turnoverTenmonthData, setTurnoverTenmonthData] = useState(null);
  const [netprofitTenmonthData, setNetprofitTenmonthData] = useState(null);
  const [productStockData, setProductStockData] = useState(null);
  const [productDetailsData, setProductDetailsData] = useState(null);
  const [productManufacturingpermonth, setProductManufacturingpermonth] =
    useState(null);
  const [productSoldpermonth, setProductSoldpermonth] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const responseData1 = await axios.get(
          `${Backend}/API/analysis/${bid}/turnover/`
        );
        setTurnoverData(responseData1.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData2 = await axios.get(
          `${Backend}/API/analysis/${bid}/product/stock/`
        );
        setProductStockData(responseData2.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData3 = await axios.get(
          `${Backend}/API/analysis/${bid}/product/details/`
        );
        setProductDetailsData(responseData3.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData4 = await axios.get(
          `${Backend}/API/analysis/${bid}/turnover/tenmonth/`
        );
        setTurnoverTenmonthData(responseData4.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData5 = await axios.get(
          `${Backend}/API/analysis/${bid}/netprofit/tenmonth/`
        );
        setNetprofitTenmonthData(responseData5.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData6 = await axios.get(
          `${Backend}/API/analysis/${bid}/product/Manufacturing/per/month/`
        );
        setProductManufacturingpermonth(responseData6.data);
      } catch (err) {
        console.log(err);
      }

      try {
        const responseData7 = await axios.get(
          `${Backend}/API/analysis/${bid}/product/sold/per/month/`
        );
        setProductSoldpermonth(responseData7.data);
      } catch (err) {
        console.log(err);
      }
    };

    getData();
  }, [bid]);

  const handleView = (section) => {
    navigate(`/analysis/${bid}/${section}`);
  };

  const ChartContainer = ({ children }) => (
    <div className="overflow-x-auto">
      <div className="min-w-[500px] md:min-w-full">{children}</div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <AnalysisHeader />
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-6">
          {/* Turnover */}
          <h1
            id="Turnover"
            className="text-3xl font-bold text-neutral-950 mt-6"
          >
            Company Turnover
          </h1>
          {turnoverData && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <Piechart Data={turnoverData} />
              </ChartContainer>
              <button
                onClick={() => handleView("turnover")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Total Turnover Distribution in the current financial year.
              </p>
            </div>
          )}

          {turnoverTenmonthData && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <Linechart Data={turnoverTenmonthData} />
              </ChartContainer>
              <button
                onClick={() => handleView("turnover_last_months")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Last Months Turnover in Crore - A performance overview.
              </p>
            </div>
          )}

          <hr className="border-solid border-gray-950 border-x-8" />

          {/* Net Profit */}
          <h1
            id="NetProfit"
            className="text-3xl font-bold text-neutral-950 mt-6"
          >
            Company NetProfit
          </h1>
          {netprofitTenmonthData && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <Linechart Data={netprofitTenmonthData} />
              </ChartContainer>
              <button
                onClick={() => handleView("netprofit_last_months")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Last Months Net Profit in Crore - Reflecting growth and cost
                optimization.
              </p>
            </div>
          )}

          <hr className="border-solid border-gray-950 border-x-8" />

          {/* Product Analysis */}
          <h1
            id="ProductAnalysis"
            className="text-3xl font-bold text-neutral-950 mt-6"
          >
            Product Analysis
          </h1>
          {productDetailsData && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <Barsize Data={productDetailsData} />
              </ChartContainer>
              <button
                onClick={() => handleView("product_stats")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Manufacturing & Profit Distribution.
              </p>
            </div>
          )}

          {productManufacturingpermonth && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <Productmnf Data={productManufacturingpermonth} />
              </ChartContainer>
              <button
                onClick={() => handleView("product_inventory_last_month")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Manufacturing Trends Per Month.
              </p>
            </div>
          )}

          <hr className="border-solid border-gray-950 border-x-8" />

          {/* Selling Analysis */}
          <h1
            id="SellingAnalysis"
            className="text-3xl font-bold text-neutral-950 mt-6"
          >
            Product Selling Analysis
          </h1>
          {productSoldpermonth && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <ProductSell Data={productSoldpermonth} />
              </ChartContainer>
              <button
                onClick={() => handleView("product_sold_last_month")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Product Sold Per Month - Sales performance and demand analysis.
              </p>
            </div>
          )}

          <hr className="border-solid border-gray-950 border-x-8" />

          {/* Stock Analysis */}
          <h1
            id="StockAnalysis"
            className="text-3xl font-bold text-neutral-950 mt-6"
          >
            Stock Analysis
          </h1>
          {productStockData && (
            <div className="bg-white rounded-lg shadow-lg p-6 relative">
              <ChartContainer>
                <ProductStock Data={productStockData} />
              </ChartContainer>
              <button
                onClick={() => handleView("product_stock")}
                className="absolute top-4 right-4 bg-gray-300 text-black px-4 py-2 rounded-md opacity-50 hover:opacity-80"
              >
                View
              </button>
              <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                Current Month Product Stock - Inventory health overview.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analysis;
