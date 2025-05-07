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

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const res = await axios.get(
          `${Backend}/API/analysis/${bid}/product/details/`
        );
        setProductDetailsData(res.data);

        const aiRes = await axios.post(`${Backend}/API/ai/product_stats/`, {
          products: res.data,
        });
        setAiInsights(aiRes.data.insights);
      } catch (error) {
        console.error("Error fetching product details or AI insights:", error);
      }
    };

    fetchProductDetails();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Stats - Manufacturing & Profit
        </h1>

        {productDetailsData ? (
          <>
            <div className="mb-6">
              <Barsize Data={productDetailsData} />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                {aiInsights ? (
                  <>
                    <h3 className="font-semibold text-blue-800">📊 Summary:</h3>
                    <p className="mb-4">{aiInsights.summary}</p>

                    <h3 className="font-semibold text-green-800 mt-2 flex items-center gap-2">
                      <FaCheckCircle /> Strengths
                    </h3>
                    <ul className="list-disc list-inside text-green-700">
                      {aiInsights.positives?.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>

                    <h3 className="font-semibold text-yellow-800 mt-4 flex items-center gap-2">
                      <FaExclamationTriangle /> Areas for Improvement
                    </h3>
                    <ul className="list-disc list-inside text-yellow-700">
                      {aiInsights.improvements?.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>No insights available.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">
            Loading product statistics...
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductStats;
