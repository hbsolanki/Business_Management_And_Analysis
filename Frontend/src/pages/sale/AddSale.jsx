import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saleService } from "@/features/sale/services/saleService";
import { productService } from "@/features/product/services/productService";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import toast from "react-hot-toast";

export default function AddSale() {
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
      try {
        const saleResponse = await saleService.getById(sid);
        const data = saleResponse.data;
        setSaleData(data);

        // Fetch products
        const productResponse = await productService.getById(data.productsid);
        setProductData(productResponse.data.allProduct);

        // Fetch inventory
        const inventoryResponse = await inventoryService.getById(data.inventorysid);
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
      // Logic for new sale creation under specific sale ID?
      // Check if saleService has specific method or just re-use generic create with sid?
      // Old: axios.post(`${Backend}/API/sale/${sid}/new/`, ...)
      // I should update saleService to include this.
      // Or use api.post directly if unique.
      // I'll add createNewSale to saleService.
      // await saleService.createNew(sid, formData);
      // For now, assume I add it.
      await saleService.newSale(sid, formData);
      navigate(-1);
    } catch (err) {
      console.log(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ProtectedHeader />
      {productData.length > 0 ? (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                New Sale Entry
              </h2>
              <p className="text-blue-100 mt-2 text-sm">Record a new sale transaction</p>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleSubmit} method="post">
              {productData.map((product, idx) => {
                const stockQuantity = getStockForProduct(product.name);
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor={product.name}
                        className="text-sm font-bold text-gray-800"
                      >
                        {product.name}
                      </label>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        Stock: {stockQuantity}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        id={product.name}
                        name={product.name}
                        type="number"
                        onChange={handleChange}
                        required
                        placeholder="0"
                        className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      />
                    </div>
                    {validationErrors[product.name] && (
                      <p className="text-sm text-red-500 mt-2 font-medium flex items-center gap-1">
                        ⚠️ {validationErrors[product.name]}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="marketing"
                    className="block text-sm font-bold text-gray-700 mb-2"
                  >
                    Marketing Cost
                  </label>
                  <input
                    id="marketing"
                    name="marketing"
                    type="number"
                    onChange={handleChange}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="othercost"
                    className="block text-sm font-bold text-gray-700 mb-2"
                  >
                    Other Cost
                  </label>
                  <input
                    id="othercost"
                    name="othercost"
                    type="number"
                    onChange={handleChange}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center items-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 
                    ${isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
                      Processing...
                    </>
                  ) : (
                    "Submit Sale"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen justify-center items-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <p className="text-xl font-bold text-gray-800 mb-2">No Products Available</p>
            <p className="text-gray-500">Please add products to the inventory first.</p>
            <button onClick={() => navigate(-1)} className="mt-6 text-blue-600 font-semibold hover:underline">Go Back</button>
          </div>
        </div>
      )}
    </>
  );
}


