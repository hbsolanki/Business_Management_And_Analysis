import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { businessService } from "@/features/business/services/businessService";

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

      toast.success("Business updated");
      navigate(-1);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Edit Business
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Business Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />

          <input
            type="number"
            name="assets"
            placeholder="Assets"
            value={formData.assets}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />

          <input
            type="number"
            name="haveEquity"
            placeholder="Equity"
            value={formData.haveEquity}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />

          <button
            type="submit"
            disabled={saving}
            className={`w-full p-2 text-white rounded-md ${saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500"
              }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}


