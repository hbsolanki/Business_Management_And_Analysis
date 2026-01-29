import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

const GoogleLoginButton = ({ onGoogleLogin, loading }) => {
    const login = useGoogleLogin({
        onSuccess: (codeResponse) => onGoogleLogin(codeResponse),
        onError: (error) => {
            console.error("Login Failed:", error);
            toast.error("Google Login Failed");
        },
        flow: "auth-code",
    });

    return (
        <button
            type="button"
            onClick={() => login()}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-xl px-4 py-3.5 text-lg font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            <FcGoogle className="text-2xl" />
            <span>Continue with Google</span>
        </button>
    );
};

export default GoogleLoginButton;
