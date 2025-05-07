import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getGlobalVariable } from "../../../../globalVariables";
import Linechart from "../../charts/Linechart";
import {
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaSearch,
  FaChartBar,
  FaCalendarAlt,
  FaChartLine,
} from "react-icons/fa";

const Backend = getGlobalVariable();

function TurnoverLastMonths() {
  const { bid } = useParams();
  const [turnoverData, setTurnoverData] = useState(null);
  const [trend, setTrend] = useState("");

  useEffect(() => {
    const fetchTurnoverData = async () => {
      try {
        const response = await axios.get(
          `${Backend}/API/analysis/${bid}/turnover/tenmonth/`
        );
        const data = response.data?.filter(
          (val) => typeof val === "number" && val > 0
        );
        setTurnoverData(data);

        if (data?.length >= 2) {
          const diff = data[data.length - 1] - data[0];
          setTrend(diff > 0 ? "up" : diff < 0 ? "down" : "flat");
        }
      } catch (error) {
        console.error("Error fetching turnover data:", error);
      }
    };

    fetchTurnoverData();
  }, [bid]);

  const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}`;

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center py-10 px-4">
      <div className="bg-white w-full max-w-5xl p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-neutral-900 mb-6 flex items-center justify-center gap-2">
          <FaChartLine className="text-blue-600" />
          Turnover Last Month
        </h1>

        {turnoverData ? (
          <>
            <Linechart Data={turnoverData} />
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-500" />
                AI Insights
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {trend === "up" && (
                  <li className="flex items-center">
                    <FaArrowUp className="text-green-600 mr-2" />
                    Increasing turnover trend observed.
                  </li>
                )}
                {trend === "down" && (
                  <li className="flex items-center">
                    <FaArrowDown className="text-red-600 mr-2" />
                    Decreasing turnover trend – review necessary.
                  </li>
                )}
                {trend === "flat" && (
                  <li className="flex items-center">
                    <FaEquals className="text-yellow-600 mr-2" />
                    Flat trend – consider optimization.
                  </li>
                )}
                <li className="flex items-center">
                  <FaSearch className="text-gray-500 mr-2" />
                  Use this data to refine production and marketing strategy.
                </li>
                <li className="flex items-center">
                  <FaChartBar className="text-purple-600 mr-2" />
                  Total Turnover:{" "}
                  <span className="ml-1 font-medium">
                    {formatCurrency(turnoverData.reduce((a, b) => a + b, 0))}
                  </span>
                </li>
                <li className="flex items-center">
                  <FaCalendarAlt className="text-orange-600 mr-2" />
                  Average per Month:{" "}
                  <span className="ml-1 font-medium">
                    {formatCurrency(
                      Math.round(
                        turnoverData.reduce((a, b) => a + b, 0) /
                          turnoverData.length
                      )
                    )}
                  </span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600 animate-pulse">
            Loading turnover data...
          </p>
        )}
      </div>
    </div>
  );
}

export default TurnoverLastMonths;
