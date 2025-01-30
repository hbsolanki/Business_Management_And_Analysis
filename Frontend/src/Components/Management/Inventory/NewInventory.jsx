import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";

const Backend = getGlobalVariable();

function NewInventory() {
  let { iid } = useParams();
  const [inventoryData, setInventoryData] = useState(null);
  const [productData, setProductData] = useState([]);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${Backend}/API/inventory/${iid}/`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        const data = response.data;
        setInventoryData(data);

        const productResponse = await axios.get(
          `${Backend}/API/product/${data.productsid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );

        setProductData(productResponse.data.allProduct);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, [iid]);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Start loading

    try {
      await axios.post(`${Backend}/API/inventory/${iid}/new/`, formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      navigate(-1);
    } catch (err) {
      console.log(err.message);
    } finally {
      setIsSubmitting(false); // Stop loading
    }
  };

  return (
    <>
      {productData.length > 0 ? (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Inventory Details
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form className="space-y-6" onSubmit={handleSubmit} method="post">
              {productData.map((product, idx) => (
                <div key={idx}>
                  <label
                    htmlFor={product.name}
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    {product.name}
                  </label>
                  <div className="mt-2">
                    <input
                      id={product.name}
                      name={product.name}
                      type="number"
                      onChange={handleChange}
                      required
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              ))}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm 
                  ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  }
                `}
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

export default NewInventory;
