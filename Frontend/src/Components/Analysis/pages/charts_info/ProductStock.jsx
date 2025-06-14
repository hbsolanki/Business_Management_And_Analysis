import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import ProductStockChart from "../../charts/ProductStock";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaTools,
  FaChartLine,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function ProductStock() {
  const { bid } = useParams();
  const [productStockData, setProductStockData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductStock = async () => {
      try {
        const { data: stockData } = await axios.get(
          `${Backend}/API/analysis/${bid}/product/stock/`
        );
        setProductStockData(stockData);

        const { data: aiData } = await axios.post(
          `${Backend}/API/ai/product_stock/`,
          { product_stock_data: stockData }
        );
        setAiInsights(aiData.insights);
      } catch (err) {
        console.error("Error fetching product stock data:", err);
        setError("An error occurred while fetching product stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductStock();
  }, [bid]);

  const InsightBlock = ({ icon: Icon, title, color, points }) =>
    points?.length > 0 && (
      <div
        className={`bg-${color}-50 border-l-4 border-${color}-500 p-4 rounded-md shadow-sm`}
      >
        <h2
          className={`text-lg font-semibold text-${color}-800 mb-1 flex items-center gap-2`}
        >
          <Icon /> {title}
        </h2>
        <ul className={`space-y-2 text-${color}-700`}>
          {points.map((point, idx) => (
            <li key={idx} className="flex gap-2">
              <Icon className="mt-1" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Stock Overview
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 animate-pulse">
            Loading stock data...
          </p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            {productStockData && (
              <div className="overflow-x-auto">
                <ProductStockChart Data={productStockData} />
              </div>
            )}

            <div className="mt-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>

              {aiInsights?.summary && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                  <h2 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <FaLightbulb /> Summary
                  </h2>
                  <p className="text-gray-700">{aiInsights.summary}</p>
                </div>
              )}

              <InsightBlock
                icon={FaCheckCircle}
                title="Positive Insights"
                color="green"
                points={aiInsights?.positives}
              />

              <InsightBlock
                icon={FaExclamationTriangle}
                title="Areas to Improve"
                color="red"
                points={aiInsights?.improvements}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductStock;
