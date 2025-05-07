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
        // Fetch product stock data
        const response = await axios.get(
          `${Backend}/API/analysis/${bid}/product/stock/`
        );
        setProductStockData(response.data);
        console.log(response.data);

        // Fetch AI insights for product stock
        const aiResponse = await axios.post(
          `${Backend}/API/ai/product_stock/`,
          {
            product_stock_data: response.data,
          }
        );

        setAiInsights(aiResponse.data.insights);
      } catch (error) {
        console.error("Error fetching product stock data:", error);
        setError("An error occurred while fetching product stock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductStock();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Stock Overview
        </h1>

        {loading ? (
          <p className="text-center text-gray-600">Loading stock data...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            {/* Display Product Stock Chart */}
            {productStockData && <ProductStockChart Data={productStockData} />}

            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <FaChartLine className="text-blue-500" />
              AI Insights
            </h2>
            {/* Display AI Insights */}
            {aiInsights && (
              <div className="mt-6 space-y-4">
                {/* Summary of Insights */}
                {aiInsights.summary && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <FaLightbulb /> Summary
                    </h2>
                    <p className="text-gray-700">{aiInsights.summary}</p>
                  </div>
                )}

                {/* Positive Insights */}
                {aiInsights.positives?.length > 0 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-green-800 mb-1 flex items-center gap-2">
                      <FaCheckCircle /> Positive Insights
                    </h2>
                    <ul className="space-y-2">
                      {aiInsights.positives.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-green-700">
                          <FaCheckCircle className="mt-1" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas to Improve */}
                {aiInsights.improvements?.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-red-800 mb-1 flex items-center gap-2">
                      <FaTools /> Areas to Improve
                    </h2>
                    <ul className="space-y-2">
                      {aiInsights.improvements.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-red-700">
                          <FaExclamationTriangle className="mt-1" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProductStock;
