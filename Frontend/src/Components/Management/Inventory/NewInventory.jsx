import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function NewInventory() {
  let { iid } = useParams();
  const [inventaryData, setInventaryData] = useState(null);
  const [productData, setProductData] = useState([]);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});

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
        setInventaryData(data);
        const productResponse = await axios.get(
          `/API/product/${data.productid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        console.log(productResponse.data);
        setProductData(productResponse.data.allProduct);
      } catch (error) {
        console.log(error);
      }
    }
    getData();
  }, []);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `/API/inventory/${iid}/new/`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      navigate(`/inventory/${iid}`);
    } catch (err) {
      console.log(err.message);
    }
  };

  return (
    <>
      {productData.length > 0 ? (
        <>
          <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <img
                className="mx-auto h-10 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                alt="Your Company"
              />
              <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Inventory
              </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
              <form className="space-y-6" onSubmit={handleSubmit} method="post">
                {productData.map((product, idx) => {
                  return (
                    <>
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
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                    </>
                  );
                })}
                <div>
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        ""
      )}
    </>
  );
}

export default NewInventory;
