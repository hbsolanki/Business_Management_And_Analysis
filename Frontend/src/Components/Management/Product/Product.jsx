import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function Product() {
  let { pid } = useParams();
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const productResponse = await axios.get(`/API/product/${pid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        setProductData(productResponse.data.allProduct);
        console.log(productResponse.data.allProduct);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [pid]);

  const handleProductDelete = async (productId) => {
    let token = localStorage.getItem("token");
    try {
      await axios.delete(`/API/product/${pid}/${productId}/delete/`, {
        headers: {
          Authorization: `${token}`,
        },
      });
      // Refresh the product list after deletion
      setProductData((prev) =>
        prev.filter((product) => product._id !== productId)
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={`/product/${pid}/new`}
        className="focus:outline-none text-white bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-8 mt-6"
      >
        Add New Product
      </Link>

      {loading ? (
        <div className="flex justify-center items-center">
          <p>Loading...</p>
        </div>
      ) : productData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productData.map((product) => (
            <article
              key={product._id} // Use product._id as the key
              className="bg-white shadow-lg rounded-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="group relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {product.description}
                </p>
              </div>
              <div className="flex justify-between text-sm text-gray-800 mb-4">
                <span>Cost: {product.price}</span>
                <span>Revenue: {product.revenue}</span>
              </div>
              <div className="flex justify-between">
                <Link
                  to={`/product/${pid}/${product._id}/edit`}
                  className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleProductDelete(product._id)} // Pass the product ID
                  className="bg-transparent hover:bg-red-500 text-red-700 font-semibold hover:text-white py-2 px-4 border border-red-500 hover:border-transparent rounded"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500">No Products Available</div>
      )}
    </div>
  );
}

export default Product;
