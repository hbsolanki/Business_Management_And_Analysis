import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { businessService } from "@/features/business/services/businessService";
import {
  FaBuilding,
  FaMoneyBillWave,
  FaChartLine,
  FaAlignLeft,
  FaSave,
  FaArrowLeft,
} from "react-icons/fa";

export default function EditBusiness() {
  const { bid } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    assets: "",
    haveEquity: "",
    description: "",
  });

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await businessService.get(bid);
        const data = res.data;

        setFormData({
          name: data.name || "",
          assets: data.assets || "",
          haveEquity: data.haveEquity || "",
          description: data.description || "",
        });
      } catch {
        toast.error("Failed to load business");
      } finally {
        setLoading(false);
      }
    }

    fetchBusiness();
  }, [bid]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await businessService.update(bid, {
        name: formData.name,
        assets: formData.assets,
        haveEquity: formData.haveEquity,
        description: formData.description,
      });

      toast.success("Business updated successfully");
      navigate(-1);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <FaBuilding className="text-white/90" />
              Edit Business
            </h2>
            <p className="text-blue-100 mt-2">
              Update your business details and information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaBuilding className="text-gray-400" />
                  Business Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter business name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaMoneyBillWave className="text-gray-400" />
                    Assets Value
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="assets"
                      value={formData.assets}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Equity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaChartLine className="text-gray-400" />
                    Equity (%)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="haveEquity"
                      value={formData.haveEquity}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                      placeholder="0-100"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaAlignLeft className="text-gray-400" />
                  Description
                </label>
                <div className="relative rounded-md shadow-sm">
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Describe your business..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 ${saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                  }`}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


