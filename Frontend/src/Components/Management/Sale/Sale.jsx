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
        console.log(data);
        setSaleData(data);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
    getData();
  }, [sid]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={`/sale/${sid}/new`}
        className="focus:outline-none text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-8 mt-6"
      >
        New Sale Input
      </Link>

      {loading ? (
        <div className="flex justify-center items-center">
          <p>Loading...</p>
        </div>
      ) : saleData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {saleData.saleInfo.map((sale, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-lg p-6 border border-gray-200"
            >
              <h2 className="text-xl font-semibold mb-4">
                Sale Data (ID: {sale._id})
              </h2>
              <div>
                <p className="font-medium">
                  Total Revenue:{" "}
                  {sale.totalRevenueFromProduct
                    ? sale.totalRevenueFromProduct
                    : sale.COGS}
                </p>
                <p className="font-medium">
                  Total Cost: {sale.totalCostFromProduct}
                </p>
                <p className="font-medium">Marketing Cost: {sale.marketing}</p>
                <p className="font-medium">Other Costs: {sale.othercost}</p>
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
              <h3 className="font-semibold mt-4">Products:</h3>
              <ul className="list-disc pl-5">
                {sale.allProductSale.map((product, idx) => (
                  <li key={idx} className="mb-2">
                    <strong>{Object.keys(product)[0]}:</strong> Sold{" "}
                    {product[Object.keys(product)[0]]} units | Cost:{" "}
                    {product.cost} | Revenue: {product.revenue}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>No sale data available.</p>
      )}
    </div>
  );
}

export default Sale;
