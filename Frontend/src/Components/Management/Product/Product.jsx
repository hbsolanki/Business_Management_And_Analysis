import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import OwnerHeader from "../../Owner/OwnerHeader";
import EmployeeHeader from "../Employee/EmployeeHeader";
import { getGlobalVariable } from "../../../globalVariables";
import GeneralModal from "../../Utils/GeneralModal"; // Import GeneralModal

const Backend = getGlobalVariable();
const type = localStorage.getItem("type");

function Product() {
  let { pid } = useParams();
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null); // Track expanded product ID

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const productResponse = await axios.get(
          `${Backend}/API/product/${pid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        setProductData(productResponse.data.allProduct);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [pid]);

  const handleProductDelete = async () => {
    let token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${Backend}/API/product/${pid}/${productToDelete}/delete/`,
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );
      setProductData((prev) =>
        prev.filter((product) => product._id !== productToDelete)
      );
      setIsModalOpen(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleReadMore = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  return (
    <>
      <GeneralModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleProductDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <div className="container mx-auto p-4">
        {type === "owner" ? (
          <OwnerHeader Businessid={localStorage.getItem("bid")} />
        ) : (
          <EmployeeHeader
            employeeData={{
              id: localStorage.getItem("oeid"),
              workpage: localStorage.getItem("workpage") || null,
            }}
          />
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Product List</h2>
          <Link
            to={`/product/${pid}/new`}
            className="focus:outline-none text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
          >
            Add New Product
          </Link>
        </div>

        {/* Loading Indicator */}
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
        ) : productData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productData.map((product) => (
              <article
                key={product._id}
                className="bg-white shadow-lg rounded-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                {/* Product Details */}
                <div className="group flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {product.description?.length > 150
                      ? expandedProductId === product._id
                        ? product.description
                        : `${product.description.substring(0, 150)}...`
                      : product.description || "No description available."}
                  </p>
                  {product.description?.length > 150 && (
                    <button
                      onClick={() => handleReadMore(product._id)}
                      className="text-blue-600 hover:underline"
                    >
                      {expandedProductId === product._id
                        ? "Read Less"
                        : "Read More"}
                    </button>
                  )}
                </div>

                {/* Pricing Info */}
                <div className="flex justify-between text-sm text-gray-700 mb-4">
                  <span className="font-medium">Cost: ₹{product.price}</span>
                  <span className="font-medium">
                    Revenue: ₹{product.revenue}
                  </span>
                </div>

                {/* Action Links */}
                <div className="flex space-x-2  mt-auto">
                  <Link
                    to={`/product/${pid}/${product._id}/edit`}
                    className="text-blue-600  transition duration-200"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      setProductToDelete(product._id);
                      setIsModalOpen(true);
                    }}
                    className="text-red-600 transition duration-200"
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
    </>
  );
}

export default Product;
