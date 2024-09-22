import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Sale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/sale/${sid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        setSaleData(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [sid]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sales Information</h1>
        <Link
          to={`/sale/${sid}/new`}
          className="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
        >
          New Sale Input
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      ) : saleData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {saleData.saleInfo.map((sale) => (
            <div
              key={sale._id}
              className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 transition-transform duration-300 hover:shadow-xl"
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Sale Data (ID: {sale._id})
              </h2>
              <div>
                <p className="font-medium text-gray-800">
                  Total Revenue: {sale.totalRevenueFromProduct || sale.COGS}
                </p>
                <p className="font-medium text-gray-800">
                  Total Cost: {sale.totalCostFromProduct}
                </p>
                <p className="font-medium text-gray-800">
                  Marketing Cost: {sale.marketing}
                </p>
                <p className="font-medium text-gray-800">
                  Other Costs: {sale.othercost}
                </p>
                <p className="text-sm text-gray-500">
                  Date: {new Date(sale.date).toLocaleDateString()}{" "}
                  {new Date(sale.date).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <h3 className="font-semibold mt-4 text-gray-800">Products:</h3>
              <ul className="list-disc pl-5">
                {sale.allProductSale.map((product, idx) => {
                  const productName = Object.keys(product)[0];
                  return (
                    <li key={idx} className="mb-2 text-gray-700">
                      <strong>{productName}:</strong> Sold{" "}
                      {product[productName]} units | Cost: {product.cost} |
                      Revenue: {product.revenue}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">No sale data available.</p>
      )}
    </div>
  );
}

export default Sale;
