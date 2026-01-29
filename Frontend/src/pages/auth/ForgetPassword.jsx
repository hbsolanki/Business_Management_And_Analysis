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
      navigate("/login");
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
        <div className="relative group">
          <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
          <input
            name="username"
            type="text"
            required
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {loading ? "Sending..." : <><FaPaperPlane /> Send OTP</>}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-6">
      <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm text-center">
        We sent an OTP to your email associated with <strong>{formData.username}</strong>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
        <div className="relative group">
          <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
          <input
            name="otp"
            type="text"
            required
            value={formData.otp}
            onChange={handleChange}
            placeholder="Enter 6-digit OTP"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all tracking-widest text-center font-mono text-lg"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {loading ? "Verifying..." : <><FaCheckCircle /> Verify OTP</>}
      </button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
        <div className="relative group">
          <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
          <input
            name="newPassword"
            type="password"
            required
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="New password"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
        <div className="relative group">
          <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition" />
          <input
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {loading ? "Resetting..." : <><FaCheckCircle /> Reset Password</>}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      <Header />

      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 flex justify-center items-center flex-grow pt-20 pb-10 relative z-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-30 skew-x-12 transform -translate-x-1/2"></div>
            <h2 className="text-2xl font-bold text-white mb-1 relative z-10">
              {step === 1 && "Find Your Account"}
              {step === 2 && "Enter OTP"}
              {step === 3 && "Reset Password"}
            </h2>
            <p className="text-blue-100 text-sm relative z-10">
              {step === 1 && "Enter your username to receive a reset code."}
              {step === 2 && "Check your email for the verification code."}
              {step === 3 && "Secure your account with a new password."}
            </p>
          </div>

          <div className="p-8">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="text-center pt-6 mt-2 border-t border-gray-100">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600 transition"
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


