import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { getGlobalVariable } from "../../globalVariables";
const Backend = getGlobalVariable();

function EditBusiness() {
  const { bid } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    assets: "",
    haveEquity: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      let token = localStorage.getItem("token");

      try {
        const response = await axios.get(
          `${Backend}/API/owner/business/data/${bid}/`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );

        setFormData({
          name: response.data.name || "",
          assets: response.data.assets || "",
          haveEquity: response.data.haveEquity || "",
          description: response.data.description || "",
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching business details:", error);
      }
    };

    fetchBusinessDetails();
  }, [bid, navigate]);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let token = localStorage.getItem("token");

    try {
      await axios.put(`${Backend}/API/owner/business/edit/${bid}/`, formData, {
        headers: {
          Authorization: `${token}`,
        },
      });
      alert("Business updated successfully!");
      navigate(-1);
    } catch (error) {
      console.error("Error updating business:", error);
      alert("Failed to update business. Please try again.");
    }
  };

  if (isLoading) {
    return <p>Loading business details...</p>;
  }

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Edit Business
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Business Name
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="assets"
                  className="block text-sm font-semibold leading-6 text-gray-900"
                >
                  Assets
                </label>
                <div className="mt-2.5">
                  <input
                    type="number"
                    name="assets"
                    id="assets"
                    value={formData.assets}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="haveEquity"
                  className="block text-sm font-semibold leading-6 text-gray-900"
                >
                  Have Equity
                </label>
                <div className="mt-2.5">
                  <input
                    type="number"
                    name="haveEquity"
                    id="haveEquity"
                    max={100}
                    value={formData.haveEquity}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Description
              </label>
              <div className="mt-2">
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                ></textarea>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default EditBusiness;
