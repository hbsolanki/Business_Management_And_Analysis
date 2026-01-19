import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

import AnalyticsHeader from "@/features/analytics/components/AnalyticsHeader";
import Barsize from "@/features/analytics/components/charts/BasicBars";
import Radar from "@/features/analytics/components/charts/Radar";
import ProductStock from "@/features/analytics/components/charts/ProductStock";
import { toPng } from "html-to-image";
import ProductDetailsBar from "@/features/analytics/utils/ProductDetailsBar";

/* ---------- helpers ---------- */
const normalizeProductDetails = (data) =>
  data.map((p) => ({
    ...p,
    cost_price: Number(p.cost_price),
    base_price: Number(p.base_price),
    net_profit: Number(p.net_profit),
  }));

function Analytics() {
  const navigate = useNavigate();

  const [productStockData, setProductStockData] = useState([]);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const productDetailsBarRef = useRef(null);
  const productDetailsRadarRef = useRef(null);
  const stockRef = useRef(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const [detailsRes, stockRes] = await Promise.all([
          api.get("/analytics/product/details/"),
          api.get("/analytics/product/stocks/"),
        ]);

        setProductDetailsData(
          normalizeProductDetails(detailsRes.data)
        );
        setProductStockData(stockRes.data);
      } catch (err) {
        console.error("Analytics fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <AnalyticsHeader />

      <div className="container mx-auto grid gap-6">

        {/* -------- Product Details (Bar) -------- */}
        {productDetailsData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 relative">
            <div ref={productDetailsBarRef}>
              <ProductDetailsBar Data={productDetailsData} />
            </div>

            <ChartButtons
              chartRef={productDetailsBarRef}
              fileName="product_bar.png"
              onView={() => navigate("/analytics/product_stats")}
            />
          </div>
        )}

        {/* -------- Product Details (Radar) -------- */}
        {/*{productDetailsData.length > 0 && (*/}
        {/*  <div className="bg-white rounded-lg shadow p-6 relative">*/}
        {/*    <div ref={productDetailsRadarRef}>*/}
        {/*      <Radar*/}
        {/*        Data={productDetailsData}*/}
        {/*        metrics={[*/}
        {/*          "Selling Price",*/}
        {/*          "Manufacturing cost",*/}
        {/*          "Profit",*/}
        {/*        ]}*/}
        {/*      />*/}
        {/*    </div>*/}

        {/*    <ChartButtons*/}
        {/*      chartRef={productDetailsRadarRef}*/}
        {/*      fileName="product_radar.png"*/}
        {/*      onView={() => navigate("/analytics/product_stats")}*/}
        {/*    />*/}
        {/*  </div>*/}
        {/*)}*/}

        {/* -------- Product Stock -------- */}
        {productStockData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 relative">
            <div ref={stockRef}>
              <ProductStock data={productStockData} />
            </div>

            <ChartButtons
              chartRef={stockRef}
              fileName="product_stock.png"
              onView={() => navigate("/analytics/product_stock")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- chart buttons ---------- */
const ChartButtons = ({ onView, chartRef, fileName }) => {
  const handleDownload = () => {
    if (!chartRef?.current) return;

    toPng(chartRef.current, { backgroundColor: "white" })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      })
      .catch(console.error);
  };

  return (
    <div className="absolute top-4 right-4 flex gap-2">
      <button
        onClick={onView}
        className="bg-gray-300 px-3 py-1 rounded hover:opacity-80"
      >
        View
      </button>
      <button
        onClick={handleDownload}
        className="bg-gray-300 px-3 py-1 rounded hover:opacity-80"
      >
        Download
      </button>
    </div>
  );
};

export default Analytics;
