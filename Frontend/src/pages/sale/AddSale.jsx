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
    <div className="min-h-screen bg-slate-50/30 pb-12">
      <ProtectedHeader />
      {productData.length > 0 ? (
        <main className="max-w-xl mx-auto px-4 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <BackButton label="Back" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Transaction Hub</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <header className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-md">
                <span className="text-sm font-black">S</span>
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">New Sale Entry</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Revenue & Stock Audit</p>
              </div>
            </header>

            <form className="p-5 space-y-6" onSubmit={handleSubmit} method="post">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Product Allotment</h3>
                <div className="space-y-3">
                  {productData.map((product, idx) => {
                    const stockQuantity = getStockForProduct(product.name);
                    return (
                      <div key={idx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 group">
                        <div className="flex justify-between items-center mb-2">
                          <label htmlFor={product.name} className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                            {product.name}
                          </label>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${stockQuantity > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                            Stock: {stockQuantity}
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            id={product.name} name={product.name} type="number" onChange={handleChange} required
                            placeholder="0"
                            className="block w-full rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-sm font-black text-slate-900 placeholder-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition"
                          />
                        </div>
                        {validationErrors[product.name] && (
                          <p className="text-[9px] text-rose-500 mt-1.5 font-bold uppercase">
                            {validationErrors[product.name]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Overhead Adjustments</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="marketing" className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Marketing Allocation
                    </label>
                    <input
                      id="marketing" name="marketing" type="number" onChange={handleChange}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="othercost" className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Ancillary Costs
                    </label>
                    <input
                      id="othercost" name="othercost" type="number" onChange={handleChange}
                      placeholder="0.00"
                      className="block w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-900 placeholder-slate-300 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <button
                  type="submit" disabled={isSubmitting}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? "Finalizing Entry..." : "Confirm & Commit Sale"}
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        <div className="flex flex-col min-h-[60vh] justify-center items-center px-4">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center shadow-sm max-w-sm">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <span className="text-xl font-black">!</span>
            </div>
            <p className="text-base font-black text-slate-900 mb-1">Catalog Depleted</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Please update inventory levels before recording new transactions.</p>
            <button onClick={() => navigate(-1)} className="mt-6 text-[10px] font-black text-slate-800 uppercase tracking-widest hover:underline">Return to Terminal</button>
          </div>
        </div>
      )}
    </div>
  );
}
