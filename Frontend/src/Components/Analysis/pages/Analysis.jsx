import AnalysisHeader from "./AnalysisHeader";
import { useState, useEffect } from "react";
import Piechart from "../charts/Piechart";
import Linechart from "../charts/Linechart";
import Barsize from "../charts/Barsize";
import ProductSell from "../charts/ProductSell";
import Productmnf from "../charts/Productmnf";
import ProductStock from "../charts/ProductStock";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../globalVariables";

const Backend = getGlobalVariable();

// Reusable Chart Section Component
const ChartSection = ({ title, data, ChartComponent, description }) => (
  <>
    <h1 className="text-3xl font-bold text-neutral-950 mt-6">{title}</h1>
    {data ? (
      data.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <ChartComponent Data={data} />
          <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
            {description}
          </p>
        </div>
      ) : (
        <p className="text-center text-gray-500">Not enough data available.</p>
      )
    ) : (
      <p className="text-center text-gray-500">
        Loading {title.toLowerCase()}...
      </p>
    )}
    <hr className="border-solid border-gray-950 border-x-8" />
  </>
);

function Analysis() {
  let { bid } = useParams();

  const [turnoverData, setTurnoverData] = useState(null);
  const [turnoverTenmonthData, setTurnoverTenmonthData] = useState(null);
  const [netprofitTenmonthData, setNetprofitTenmonthData] = useState(null);
  const [productStockData, setProductStockData] = useState(null);
  const [productDetailsData, setProductDetailsData] = useState(null);
  const [productManufacturingPerMonth, setProductManufacturingPerMonth] =
    useState(null);
  const [productSoldPerMonth, setProductSoldPerMonth] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const [
          turnoverRes,
          productStockRes,
          productDetailsRes,
          turnoverTenMonthRes,
          netProfitTenMonthRes,
          productMnfPerMonthRes,
          productSoldPerMonthRes,
        ] = await Promise.all([
          axios.get(`${Backend}/API/analysis/${bid}/turnover/`),
          axios.get(`${Backend}/API/analysis/${bid}/product/stock/`),
          axios.get(`${Backend}/API/analysis/${bid}/product/details/`),
          axios.get(`${Backend}/API/analysis/${bid}/turnover/tenmonth/`),
          axios.get(`${Backend}/API/analysis/${bid}/netprofit/tenmonth/`),
          axios.get(
            `${Backend}/API/analysis/${bid}/product/Manufacturing/per/month/`
          ),
          axios.get(`${Backend}/API/analysis/${bid}/product/sold/per/month/`),
        ]);

        setTurnoverData(turnoverRes.data);
        setProductStockData(productStockRes.data);
        setProductDetailsData(productDetailsRes.data);
        setTurnoverTenmonthData(turnoverTenMonthRes.data);
        setNetprofitTenmonthData(netProfitTenMonthRes.data);
        setProductManufacturingPerMonth(productMnfPerMonthRes.data);
        setProductSoldPerMonth(productSoldPerMonthRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    getData();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      {/* Navigation Bar */}
      <AnalysisHeader />

      {/* Main Content */}
      <div className="container mx-auto">
        <div className="grid grid-cols-1 gap-6">
          {/* Company Turnover */}
          <ChartSection
            title="Company Turnover"
            data={turnoverData}
            ChartComponent={Piechart}
            description="Total Turnover Distribution"
          />
          <ChartSection
            title="Last 10 Month Turnover"
            data={turnoverTenmonthData}
            ChartComponent={Linechart}
            description="Last 10 Month Company Turnover in crore"
          />

          {/* Company NetProfit */}
          <ChartSection
            title="Company NetProfit"
            data={netprofitTenmonthData}
            ChartComponent={Linechart}
            description="Last 10 Month Company NetProfit in crore"
          />

          {/* Product Analysis */}
          <ChartSection
            title="Product Analysis"
            data={productDetailsData}
            ChartComponent={Barsize}
            description="Product Manufacturing & Profit Distribution"
          />
          <ChartSection
            title="Product Manufacturing Per Month"
            data={productManufacturingPerMonth}
            ChartComponent={Productmnf}
            description="Monthly Product Manufacturing Trends"
          />

          {/* Product Selling Analysis */}
          <ChartSection
            title="Product Selling Analysis"
            data={productSoldPerMonth}
            ChartComponent={ProductSell}
            description="Monthly Product Selling Trends"
          />

          {/* Stock Analysis */}
          <ChartSection
            title="Stock Analysis"
            data={productStockData}
            ChartComponent={ProductStock}
            description="Current Month Product Stock Levels"
          />
        </div>
      </div>
    </div>
  );
}

export default Analysis;
