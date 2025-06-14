import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Piechart from "../../charts/Piechart";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartPie,
  FaLightbulb,
  FaTools,
  FaChartLine,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function Turnover() {
  const { bid } = useParams();
  const [turnoverData, setTurnoverData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${Backend}/API/analysis/${bid}/turnover/`);
        setTurnoverData(res.data);

        const aiRes = await axios.post(`${Backend}/API/ai/turnover/`, {
          turnover_data: res.data,
        });

        setAiInsights(aiRes.data.insights);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bid]);

  const ChartContainer = ({ children }) => (
    <div className="overflow-x-auto">
      <div className="min-w-[500px] md:min-w-full">{children}</div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen py-8 px-4 flex justify-center">
      <div className="bg-white w-full max-w-4xl p-6 rounded-lg shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6 flex items-center justify-center gap-2">
          <FaChartPie className="text-indigo-600" /> Turnover Analysis
        </h1>

        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : (
          <>
            {turnoverData && (
              <ChartContainer>
                <Piechart Data={turnoverData} Height={300} t={850} />
              </ChartContainer>
            )}

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-2 flex items-center gap-2">
              <FaChartLine className="text-blue-500" />
              AI Insights
            </h2>

            {aiInsights && (
              <div className="mt-6 space-y-4">
                {aiInsights.summary && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <FaLightbulb /> Summary
                    </h2>
                    <p className="text-gray-700 break-words">
                      {aiInsights.summary}
                    </p>
                  </div>
                )}

                {aiInsights.positives?.length > 0 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-green-800 mb-1 flex items-center gap-2">
                      <FaCheckCircle /> Strengths
                    </h2>
                    <ul className="space-y-1">
                      {aiInsights.positives.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-green-700">
                          <FaCheckCircle className="mt-1" />
                          <span className="break-words">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiInsights.improvements?.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                    <h2 className="text-lg font-semibold text-red-800 mb-1 flex items-center gap-2">
                      <FaTools /> Areas to Improve
                    </h2>
                    <ul className="space-y-1">
                      {aiInsights.improvements.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-red-700">
                          <FaExclamationTriangle className="mt-1" />
                          <span className="break-words">{point}</span>
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

export default Turnover;
