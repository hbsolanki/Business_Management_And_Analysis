import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

export default function BackButton({ to, label = "Back", className = "" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-colors ${className}`}
    >
      <FaArrowLeft />
      {label}
    </button>
  );
}
