import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Productmnf from "../../charts/Productmnf";
import { FaIndustry, FaArrowUp, FaChartLine } from "react-icons/fa";

const Backend = getGlobalVariable();

function ProductInventoryLastMonth() {
  const { bid } = useParams();
  const [manufacturingData, setManufacturingData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${Backend}/API/analysis/${bid}/product/Manufacturing/per/month/`
        );
        setManufacturingData(res.data);

        const aiRes = await axios.post(
          `${Backend}/API/ai/product_inventory_last_month/`,
          { inventory_data: res.data }
        );
        setAiInsights(aiRes.data.insights);
      } catch (err) {
        console.error("Error loading manufacturing insights:", err);
      }
    };

    fetchData();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Manufacturing - Last Months
        </h1>

        {manufacturingData ? (
          <>
            <div className="mb-6">
              <Productmnf Data={manufacturingData} />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                {aiInsights ? (
                  <>
                    <p className="mb-2">{aiInsights.summary}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <FaArrowUp className="text-green-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>No AI insights available.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">
            Loading manufacturing data...
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductInventoryLastMonth;
