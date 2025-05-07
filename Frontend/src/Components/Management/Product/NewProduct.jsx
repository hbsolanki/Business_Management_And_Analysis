import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getGlobalVariable } from "../../../globalVariables";

const Backend = getGlobalVariable();

function NewProduct() {
  let { pid } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Start loading

    try {
      let token = localStorage.getItem("token");

      await axios.post(`${Backend}/API/product/${pid}/new/`, formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-6">
          New Product
        </h2>

        <form className="space-y-5" onSubmit={handleSubmit} method="post">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-900"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-900"
            >
              Price
            </label>
            <input
              id="price"
              name="price"
              type="number"
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="revenue"
              className="block text-sm font-medium text-gray-900"
            >
              Revenue
            </label>
            <input
              id="revenue"
              name="revenue"
              type="number"
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-900"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-gray-900 shadow-sm focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex w-full justify-center items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm 
                ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
  );
}

export default NewProduct;
