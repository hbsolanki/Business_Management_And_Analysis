import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";
const Backend = getGlobalVariable();

function NewSale() {
  let { sid } = useParams();
  const [saleData, setSaleData] = useState(null);
  const [productData, setProductData] = useState([]);
  const [inventoryStockData, setInventoryStockData] = useState([]);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(""); // State to hold error message

  useEffect(() => {
    async function getData() {
      let token = localStorage.getItem("token");

      try {
        const saleResponse = await axios.get(`${Backend}/API/sale/${sid}/`, {
          headers: {
            Authorization: `${token}`,
          },
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

  const handleChange = (e) => {
    const name = e.target.name;
    const value = parseInt(e.target.value);
    const productName = e.target.id;

    // If the field is not a product, do not apply stock validation
    if (name !== "marketing" && name !== "othercost") {
      const stockQuantity = getStockForProduct(productName);

      if (value > stockQuantity) {
        setError(
          `You cannot add more than ${stockQuantity} units of ${productName}.`
        );
      } else {
        setError(""); // Clear the error message if the value is valid
      }
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) {
      alert(error); // If there's an error, stop the submission
      return;
    }

    try {
      const response = await axios.post(
        `${Backend}/API/sale/${sid}/new/`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      navigate(-1);
    } catch (err) {
      console.log(err.message);
    }
  };

  const getStockForProduct = (productName) => {
    const stock = inventoryStockData.find(
      (item) => item.product === productName
    );
    return stock ? stock.quantity : 0;
  };

  return (
    <>
      {productData.length > 0 ? (
        <>
          <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Sale
              </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
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
                          Available Stock: {stockQuantity}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {error && (
                  <div className="text-sm text-red-600 mt-2">
                    <p>{error}</p>
                  </div>
                )}

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
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-md bg-gray-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-full justify-center items-center mt-8">
          <p className="text-center text-gray-600 text-lg">No Product found.</p>
        </div>
      )}
    </>
  );
}

export default NewSale;
