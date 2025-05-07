import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import ProductSell from "../../charts/ProductSell";
import { FaChartLine } from "react-icons/fa";
const Backend = getGlobalVariable();

function ProductSoldLastMonth() {
  const { bid } = useParams();
  const [soldData, setSoldData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    const fetchSoldData = async () => {
      try {
        const response = await axios.get(
          `${Backend}/API/analysis/${bid}/product/sold/per/month/`
        );
        console.log("Fetched sold data:", response.data);

        // Only proceed if the data is an object
        if (
          response.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data)
        ) {
          setSoldData(response.data);

          const aiRes = await axios.post(
            `${Backend}/API/ai/product_sold_last_month/`,
            {
              sales_data: response.data,
            }
          );

          console.log("AI Insights:", aiRes.data);
          setAiInsights(aiRes.data.insights);
        } else {
          console.error("Unexpected format for sales data:", response.data);
        }
      } catch (error) {
        console.error("Error fetching sold product data:", error);
      }
    };

    fetchSoldData();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Sold - Last Months
        </h1>

        {soldData ? (
          <>
            <div className="mb-6">
              <ProductSell Data={soldData} />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                {aiInsights ? (
                  <>
                    <h3 className="font-semibold text-blue-800">Summary:</h3>
                    <p>{aiInsights.summary}</p>
                    <h3 className="font-semibold text-blue-800 mt-4">
                      Strengths:
                    </h3>
                    <ul className="list-disc list-inside">
                      {aiInsights.positives?.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                    <h3 className="font-semibold text-blue-800 mt-4">
                      Areas for Improvement:
                    </h3>
                    <ul className="list-disc list-inside">
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
          <p className="text-center text-gray-600">Loading sales data...</p>
        )}
      </div>
    </div>
  );
}

export default ProductSoldLastMonth;
