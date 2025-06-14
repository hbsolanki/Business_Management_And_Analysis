import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Linechart from "../../charts/Linechart";
import { FaChartLine, FaCheckCircle } from "react-icons/fa";

const Backend = getGlobalVariable();

function NetprofitLastMonths() {
  const { bid } = useParams();
  const [netProfitData, setNetProfitData] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNetProfit = async () => {
      try {
        const response = await axios.get(
          `${Backend}/API/analysis/${bid}/netprofit/tenmonth/`
        );

        const cleaned = response.data?.filter(
          (val) => typeof val === "number" && val > 0
        );
        setNetProfitData(cleaned || []);

        if (cleaned && cleaned.length > 0) {
          const aiRes = await axios.post(
            `${Backend}/API/ai/netprofit_last_months/`,
            {
              netprofit_last_months: cleaned,
            }
          );
          setAiInsights(aiRes.data.insights || []);
        }
      } catch (error) {
        console.error("Error fetching net profit data:", error);
        setError("Failed to load net profit data.");
      } finally {
        setLoading(false);
      }
    };

    fetchNetProfit();
  }, [bid]);

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6 flex items-center justify-center gap-2">
          <FaChartLine className="text-blue-600" />
          Net Profit - Last 10 Months
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 animate-pulse">
            Loading net profit data...
          </p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : netProfitData.length === 0 ? (
          <p className="text-center text-yellow-500">
            No valid net profit data found.
          </p>
        ) : (
          <>
            <div className="mb-6">
              <Linechart Data={netProfitData} />
            </div>

            {aiInsights.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FaChartLine className="text-blue-500" />
                  AI Insights
                </h2>
                <div className="bg-blue-50 rounded-xl p-4 shadow space-y-3">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200"
                    >
                      <FaCheckCircle className="text-green-500 mt-1" />
                      <span className="text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 mt-6">
                No AI insights available.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default NetprofitLastMonths;
