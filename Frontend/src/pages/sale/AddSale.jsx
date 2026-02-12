import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { saleService } from "@/features/sale/services/saleService";
import { productService } from "@/features/product/services/productService";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import BackButton from "@/components/shared/BackButton";
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
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-transparent">
          <div className="form-card w-full max-w-lg overflow-hidden">
            <div className="p-4">
              <BackButton />
            </div>

            <div className="form-header">
              <div className="form-header-icon">S</div>
              <div>
                <h2 className="form-title">New Sale Entry</h2>
                <p className="form-subtitle">Record a new sale transaction.</p>
              </div>
            </div>

            <form className="form-section space-y-6" onSubmit={handleSubmit} method="post">
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
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
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
                        className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition"
                      />
                    </div>
                    {validationErrors[product.name] && (
                      <p className="text-sm text-rose-600 mt-2 font-medium flex items-center gap-1">
                        {validationErrors[product.name]}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="marketing" className="block text-sm font-semibold text-slate-700 mb-2">
                    Marketing Cost
                  </label>
                  <input
                    id="marketing"
                    name="marketing"
                    type="number"
                    onChange={handleChange}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="othercost" className="block text-sm font-semibold text-slate-700 mb-2">
                    Other Cost
                  </label>
                  <input
                    id="othercost"
                    name="othercost"
                    type="number"
                    onChange={handleChange}
                    placeholder="0.00"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn-primary w-full ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <>
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
        <div className="flex flex-col min-h-screen justify-center items-center bg-transparent">
          <div className="form-card text-center p-8 rounded-2xl">
            <p className="text-xl font-bold text-slate-900 mb-2">No Products Available</p>
            <p className="text-slate-500">Please add products to the inventory first.</p>
            <button onClick={() => navigate(-1)} className="mt-6 text-slate-700 font-semibold hover:underline">Go Back</button>
          </div>
        </div>
      )}
    </>
  );
}
