import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Productmnf from "../../charts/Productmnf";
import {
  FaIndustry,
  FaChartLine,
  FaArrowUp,
  FaExclamationTriangle,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function ProductInventoryLastMonth() {
  const { bid } = useParams();
  const [manufacturingData, setManufacturingData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${Backend}/API/analysis/${bid}/product/Manufacturing/per/month/`
        );

        if (res.data && typeof res.data === "object") {
          setManufacturingData(res.data);

          const aiRes = await axios.post(
            `${Backend}/API/ai/product_inventory_last_month/`,
            { inventory_data: res.data }
          );
          setAiInsights(aiRes.data.insights);
        } else {
          throw new Error("Unexpected data format");
        }
      } catch (err) {
        console.error("Error loading manufacturing insights:", err);
        setError("Failed to fetch manufacturing or AI insights.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bid]);

  const InsightList = ({ title, icon: Icon, color, items }) =>
    items?.length > 0 && (
      <div className="mt-4">
        <h3
          className={`font-semibold text-${color}-800 flex items-center gap-2`}
        >
          <Icon /> {title}
        </h3>
        <ul className={`list-disc list-inside text-${color}-700`}>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <FaArrowUp className={`text-${color}-500`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6">
          Product Manufacturing - Last Months
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 animate-pulse">
            Loading manufacturing data...
          </p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
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
                    <h3 className="font-semibold text-blue-800 mb-1">
                      📊 Summary
                    </h3>
                    <p className="text-gray-700">{aiInsights.summary}</p>

                    <InsightList
                      title="Highlights"
                      icon={FaArrowUp}
                      color="green"
                      items={aiInsights.highlights}
                    />
                  </>
                ) : (
                  <p className="text-gray-600 italic">
                    No AI insights available.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductInventoryLastMonth;
