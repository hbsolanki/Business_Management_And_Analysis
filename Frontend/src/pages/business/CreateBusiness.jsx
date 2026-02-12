import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { businessService } from "@/features/business/services/businessService";
import BackButton from "@/components/shared/BackButton";

export default function CreateBusiness() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await businessService.create(formData);
      navigate(-1);
    } catch (error) {
      alert("Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="form-shell py-12 max-w-xl">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">B</div>
            <div>
              <h2 className="form-title">Create Business</h2>
              <p className="form-subtitle">Register your business to unlock full access.</p>
            </div>
          </div>

          <form className="form-section space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">Business Name</label>
              <input
                id="name"
                name="name"
                type="text"
                onChange={handleChange}
                required
                className="w-full"
                placeholder="Enter business name"
              />
            </div>

            <div>
              <label htmlFor="gst_number">GST Number</label>
              <input
                type="text"
                name="gst_number"
                id="gst_number"
                onChange={handleChange}
                className="w-full"
                placeholder="Enter GST number"
              />
            </div>

            <div>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                onChange={handleChange}
                rows={3}
                className="w-full"
                placeholder="Describe your business"
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className={`btn-primary ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
                {loading ? "Saving..." : "Create Business"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
