import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";
import { FaUser, FaKey, FaLock, FaArrowLeft, FaCheckCircle, FaPaperPlane } from "react-icons/fa";

// Helper to extract error message
const getErrorMessage = (err, defaultMessage) => {
  const data = err.response?.data;
  if (!data) return defaultMessage;
  if (data.detail) return data.detail;
  if (Array.isArray(data.error)) return data.error[0];
  return data.error || defaultMessage;
};

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Steps: 1 = Username, 2 = OTP, 3 = New Password
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ---------------- Step 1: Send OTP ---------------- */
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username) return;

    setLoading(true);
    try {
      const response = await authService.validateUsername(formData.username);
      // Backend responsed 200 OK: "otp send to your register email"
      toast.success(response.data.message || "OTP sent to your registered email!");
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Username not found"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Step 2: Verify OTP ---------------- */
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp) return;

    setLoading(true);
    try {
      // "give username and otp to backend"
      await authService.verifyOtp(formData.username, formData.otp);
      toast.success("OTP verified!");
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Step 3: Reset Password ---------------- */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(formData.username, formData.otp, formData.newPassword);
      toast.success("Password reset successfully! Please login.");
      navigate(-1);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Step Content Renders ---------------- */
  const renderStep1 = () => (
    <form onSubmit={handleUsernameSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
        <div className="relative">
          <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="username"
            type="text"
            required
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            className="w-full input-icon-left pr-4 py-3"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "Sending..." : <><FaPaperPlane /> Send OTP</>}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-6">
      <div className="bg-slate-50 text-slate-700 p-3 rounded-lg text-sm text-center border border-slate-200">
        We sent an OTP to your email associated with <strong>{formData.username}</strong>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
        <div className="relative">
          <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="otp"
            type="text"
            required
            value={formData.otp}
            onChange={handleChange}
            placeholder="Enter 6-digit OTP"
            className="w-full input-icon-left pr-4 py-3 tracking-widest text-center font-mono text-lg"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "Verifying..." : <><FaCheckCircle /> Verify OTP</>}
      </button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
        <div className="relative">
          <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="newPassword"
            type="password"
            required
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="New password"
            className="w-full input-icon-left pr-4 py-3"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
        <div className="relative">
          <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            className="w-full input-icon-left pr-4 py-3"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`btn-primary w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "Resetting..." : <><FaCheckCircle /> Reset Password</>}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header />

      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">
              <FaKey />
            </div>
            <div>
              <h2 className="form-title">
                {step === 1 && "Find Your Account"}
                {step === 2 && "Enter OTP"}
                {step === 3 && "Reset Password"}
              </h2>
              <p className="form-subtitle">
                {step === 1 && "Enter your username to receive a reset code."}
                {step === 2 && "Check your email for the verification code."}
                {step === 3 && "Secure your account with a new password."}
              </p>
            </div>
          </div>

          <div className="form-section">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="text-center pt-6 mt-2 border-t border-gray-100">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                <FaArrowLeft className="mr-2" /> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
