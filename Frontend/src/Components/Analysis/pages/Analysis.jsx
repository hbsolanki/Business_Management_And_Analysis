import AnalysisHeader from "./AnalysisHeader";
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
  const [productManufacturingpermonth, setProductManufacturingpermonth] =
    useState(null);
  const [productSoldpermonth, setProductSoldpermonth] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const responseData1 = await axios.get(`/API/analysis/${bid}/turnover/`);
        setTurnoverData(responseData1.data);

        const responseData2 = await axios.get(
          `/API/analysis/${bid}/product/stock/`
        );
        setProductStockData(responseData2.data);

        const responseData3 = await axios.get(
          `/API/analysis/${bid}/product/details/`
        );
        setProductDetailsData(responseData3.data);

        const responseData4 = await axios.get(
          `/API/analysis/${bid}/turnover/tenmonth/`
        );
        setTurnoverTenmonthData(responseData4.data);
        const responseData5 = await axios.get(
          `/API/analysis/${bid}/netprofit/tenmonth/`
        );
        setNetprofitTenmonthData(responseData5.data);

        const responseData6 = await axios.get(
          `/API/analysis/${bid}/product/Manufacturing/per/month/`
        );
        setProductManufacturingpermonth(responseData6.data);
        const responseData7 = await axios.get(
          `/API/analysis/${bid}/product/sold/per/month/`
        );
        setProductSoldpermonth(responseData7.data);
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
        <AnalysisHeader />
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
            {turnoverTenmonthData ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <Linechart Data={turnoverTenmonthData} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Last 10 Month Company Turnover in crore
                </p>
              </div>
            ) : (
              ""
            )}

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Company NetProfit */}
            {netprofitTenmonthData ? (
              <>
                <h1
                  id="NetProfit"
                  className="text-3xl font-bold text-neutral-950 mt-6"
                >
                  Company NetProfit
                </h1>
                <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                  <Linechart Data={netprofitTenmonthData} />
                  <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                    Last 10 Month Company NetProfit in crore
                  </p>
                </div>
              </>
            ) : (
              ""
            )}

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Product Analysis */}
            <h1
              id="ProductAnalysis"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Product Analysis
            </h1>
            {productDetailsData ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <Barsize Data={productDetailsData} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Product Mnf & Profit Distribution
                </p>
              </div>
            ) : (
              ""
            )}
            {productManufacturingpermonth ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <Productmnf Data={productManufacturingpermonth} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Product Manufacturing Per Month
                </p>
              </div>
            ) : (
              ""
            )}

            <hr className="border-solid border-gray-950 border-x-8" />

            {/* Product Selling Analysis */}
            <h1
              id="SellingAnalysis"
              className="text-3xl font-bold text-neutral-950 mt-6"
            >
              Product Selling Analysis
            </h1>
            {productSoldpermonth ? (
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <ProductSell Data={productSoldpermonth} />
                <p className="mt-4 text-center text-gray-800 text-lg font-semibold">
                  Product Sold Per Month
                </p>
              </div>
            ) : (
              ""
            )}

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
