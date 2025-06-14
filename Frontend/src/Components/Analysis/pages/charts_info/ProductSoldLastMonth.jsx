import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import ProductSell from "../../charts/ProductSell";
import {
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function ProductSoldLastMonth() {
  const { bid } = useParams();
  const [soldData, setSoldData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSoldData = async () => {
      try {
        const response = await axios.get(
          `${Backend}/API/analysis/${bid}/product/sold/per/month/`
        );
        const data = response.data;

        if (data && typeof data === "object" && !Array.isArray(data)) {
          setSoldData(data);

          const aiRes = await axios.post(
            `${Backend}/API/ai/product_sold_last_month/`,
            { sales_data: data }
          );
          setAiInsights(aiRes.data.insights);
        } else {
          throw new Error("Invalid format for sales data.");
        }
      } catch (err) {
        console.error("Error fetching sales data:", err);
        setError("Failed to load product sales data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSoldData();
  }, [bid]);

  const InsightList = ({ icon: Icon, title, color, items }) =>
    items?.length > 0 && (
      <div className="mt-4">
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
          Product Sold - Last Months
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 animate-pulse">
            Loading sales data...
          </p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            <div className="mb-6">
              <ProductSell Data={soldData} />
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
                <p className="text-gray-600 italic">
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

export default ProductSoldLastMonth;
