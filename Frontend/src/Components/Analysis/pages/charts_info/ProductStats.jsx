import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Barsize from "../../charts/Barsize";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function ProductStats() {
  const { bid } = useParams();
  const [productDetailsData, setProductDetailsData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const { data: productData } = await axios.get(
          `${Backend}/API/analysis/${bid}/product/details/`
        );
        setProductDetailsData(productData);

        const { data: aiData } = await axios.post(
          `${Backend}/API/ai/product_stats/`,
          { products: productData }
        );
        setAiInsights(aiData.insights);
      } catch (err) {
        console.error("Error fetching product details or AI insights:", err);
        setError("Failed to load product statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [bid]);

  const InsightList = ({ icon: Icon, title, color, items }) =>
    items?.length > 0 && (
      <div className={`mt-4`}>
        <h3
          className={`font-semibold text-${color}-800 flex items-center gap-2`}
        >
          <Icon /> {title}
        </h3>
        <ul className={`list-disc list-inside text-${color}-700`}>
          {items.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Stats - Manufacturing & Profit
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 animate-pulse">
            Loading product statistics...
          </p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            <div className="mb-6">
              <Barsize Data={productDetailsData} />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>

              {aiInsights ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                  {aiInsights.summary && (
                    <div>
                      <h3 className="font-semibold text-blue-800 mb-1">
                        📊 Summary
                      </h3>
                      <p className="text-gray-700">{aiInsights.summary}</p>
                    </div>
                  )}

                  <InsightList
                    icon={FaCheckCircle}
                    title="Strengths"
                    color="green"
                    items={aiInsights.positives}
                  />

                  <InsightList
                    icon={FaExclamationTriangle}
                    title="Areas for Improvement"
                    color="yellow"
                    items={aiInsights.improvements}
                  />
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">
                  No AI insights available.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductStats;
