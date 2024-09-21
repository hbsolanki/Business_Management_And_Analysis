import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Inventory() {
  let { iid } = useParams();
  const [inventoryData, setInventoryData] = useState(null);

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`/API/inventory/${iid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });
        const data = response.data;
        console.log(data);
        setInventoryData(data);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [iid]);

  const renderProductDetails = (product) => {
    // Extract product details from the stock object except _id and date
    const productDetails = Object.entries(product).filter(
      ([key, value]) => key !== "_id" && key !== "date"
    );

    return productDetails.map(([productName, quantity], idx) => (
      <p key={idx} className="mt-2">
        <span className="font-bold">{productName}</span>: {quantity}
      </p>
    ));
  };

  return (
    <>
      <Link
        to={`/inventory/${iid}/new`}
        className="focus:outline-none text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-orange-400 dark:hover:bg-orange-500 dark:focus:ring-orange-700 mt-6"
      >
        New Inventory
      </Link>

      {/* Display Inventory Data */}
      {inventoryData ? (
        <div className="max-w-3xl mx-auto p-4">
          <h2 className="text-xl font-bold mb-4">Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inventoryData.stock.map((stockEntry, idx) => (
              <article
                key={idx}
                className="border-2 p-4 border-gray-300 rounded-lg"
              >
                <h3 className="text-lg font-semibold">Stock Entry</h3>
                <p>Date: {new Date(stockEntry.date).toLocaleString()}</p>

                {/* Render each product and its quantity */}
                {renderProductDetails(stockEntry)}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
}

export default Inventory;
