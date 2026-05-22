import { useState } from "react";
import { FaSave, FaTimes, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { tokenService } from "@/services/tokenService";
import { API_BASE_URL } from "@/services/api";

export default function MessageForm({ schema, onComplete }) {
  const [formData, setFormData] = useState(schema.initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, success, error
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    
    try {
      const token = tokenService.getAccessToken();
      const response = await fetch(`${API_BASE_URL}${schema.endpoint}`, {
        method: schema.method || "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus("success");
        toast.success(schema.successMessage || "Saved successfully");
        if (onComplete) onComplete(result);
      } else {
        setStatus("error");
        setErrorMsg(typeof result === 'object' ? JSON.stringify(result) : result);
        toast.error("Validation failed. Please check the form.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg(error.message);
      toast.error("Network error. Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "success") {
    return (
      <div className="agent-rise-in rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <FaCheckCircle size={24} />
        </div>
        <h4 className="text-sm font-black uppercase tracking-tight text-emerald-900">Creation Successful</h4>
        <p className="mt-1 text-xs font-medium text-emerald-700/80">The resource has been synchronized with your business ledger.</p>
      </div>
    );
  }

  return (
    <div className="agent-rise-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-slate-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-400">
              {schema.title || "Management Action"}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Input Required</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
            <FaSave size={12} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {schema.fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5"
                rows={3}
                placeholder={field.placeholder}
              />
            ) : field.type === "checkbox" ? (
                <div className="flex items-center gap-3 px-1 py-2">
                    <input
                        type="checkbox"
                        name={field.name}
                        checked={formData[field.name] || false}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-bold text-slate-700">{field.description || field.label}</span>
                </div>
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5"
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        {status === "error" && (
          <div className="flex gap-3 rounded-xl bg-rose-50 p-3 text-rose-800 border border-rose-100">
            <FaExclamationTriangle size={14} className="shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <div className="pt-2 flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-slate-900 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : "Complete Creation"}
          </button>
        </div>
      </form>
    </div>
  );
}
