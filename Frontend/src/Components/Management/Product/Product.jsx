import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function Product() {
  let { pid } = useParams();
  const [productData, setProductData] = useState([]);

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
      }
    }
    getData();
  }, []);
  return (
    <>
      <Link
        to={`/product/${pid}/new`}
        className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 m-8 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-6"
      >
        Add New Product
      </Link>
      {productData.length > 0
        ? productData.map((product, idx) => {
            return (
              <article
                key={idx}
                className="flex max-w-xl flex-col items-start justify-between border-2 p-4 border-black-500"
              >
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                    <p href="">
                      <span className="absolute inset-0" />
                      {product.name}
                    </p>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                    {product.description}
                  </p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                  <span className="mr-4">Cost : {product.price}</span>
                  <span className="">Revenue : {product.revenue}</span>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                  {/* Edit */}

                  <Link className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded">
                    Edit
                  </Link>

                  {/* Delete */}

                  <Link className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded">
                    Delete
                  </Link>
                </div>
              </article>
            );
          })
        : ""}
    </>
  );
}

export default Product;
