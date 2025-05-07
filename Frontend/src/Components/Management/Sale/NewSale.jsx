import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
import toast from "react-hot-toast";

const Backend = getGlobalVariable();

function NewSale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [productData, setProductData] = useState([]);
  const [inventoryStockData, setInventoryStockData] = useState([]);
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");
      try {
        const saleResponse = await axios.get(`${Backend}/API/sale/${sid}/`, {
          headers: { Authorization: `${token}` },
        });
        const data = saleResponse.data;
        setSaleData(data);

        const productResponse = await axios.get(
          `${Backend}/API/product/${data.productsid}/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `${token}`,
            },
          }
        );
        setProductData(productResponse.data.allProduct);

        const inventoryResponse = await axios.get(
          `${Backend}/API/inventory/${data.inventorysid}/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `${token}`,
            },
          }
        );
        setInventoryStockData(inventoryResponse.data.productStock);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [sid]);

  const getStockForProduct = (productName) => {
    const stock = inventoryStockData.find(
      (item) => item.product === productName
    );
    return stock ? stock.quantity : 0;
  };

  const handleChange = (e) => {
    const name = e.target.name;
    const value = parseInt(e.target.value) || 0;
    const productName = e.target.id;

    const stockQuantity = getStockForProduct(productName);

    const newFormData = { ...formData, [name]: value };
    const newValidationErrors = { ...validationErrors };

    if (name !== "marketing" && name !== "othercost") {
      if (value > stockQuantity) {
        newValidationErrors[
          name
        ] = `You cannot add more than ${stockQuantity} units of ${productName}.`;
      } else {
        delete newValidationErrors[name];
      }
    }

    setFormData(newFormData);
    setValidationErrors(newValidationErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix stock quantity errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${Backend}/API/sale/${sid}/new/`, formData, {
        headers: { "Content-Type": "application/json" },
      });
      navigate(-1);
    } catch (err) {
      console.log(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {productData.length > 0 ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6 sm:max-w-sm w-full">
            <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Sale
            </h2>

            <form className="space-y-6" onSubmit={handleSubmit} method="post">
              {productData.map((product, idx) => {
                const stockQuantity = getStockForProduct(product.name);
                return (
                  <div key={idx}>
                    <label
                      htmlFor={product.name}
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      {product.name}
                    </label>
                    <div className="mt-2 flex items-center">
                      <input
                        id={product.name}
                        name={product.name}
                        type="number"
                        onChange={handleChange}
                        required
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                      />
                      <span className="ml-3 text-sm text-gray-600">
                        Stock: {stockQuantity}
                      </span>
                    </div>
                    {validationErrors[product.name] && (
                      <p className="text-sm text-red-600 mt-1">
                        {validationErrors[product.name]}
                      </p>
                    )}
                  </div>
                );
              })}

              <div>
                <label
                  htmlFor="marketing"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Marketing Cost
                </label>
                <div className="mt-2">
                  <input
                    id="marketing"
                    name="marketing"
                    type="number"
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="othercost"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Other Cost
                </label>
                <div className="mt-2">
                  <input
                    id="othercost"
                    name="othercost"
                    type="number"
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm 
                    ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-3 text-white"
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
                      Loading...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex min-h-full justify-center items-center mt-8">
          <p className="text-center text-gray-600 text-lg">No Product found.</p>
        </div>
      )}
    </>
  );
}

export default NewSale;
