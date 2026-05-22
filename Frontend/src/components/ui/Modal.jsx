import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import {
    HiOutlineExclamationTriangle,
    HiOutlineInformationCircle,
    HiOutlineCheckCircle,
} from "react-icons/hi2";

export default function Modal({
    isOpen,
    onClose,
    title,
    message,
    onConfirm,
    confirmText,
    cancelText,
    type = "danger", // danger, info, success, form
    icon: CustomIcon, // Optional custom icon
    children, // Custom content
    showFooter = true,
}) {
    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    const typeConfig = {
        danger: {
            icon: HiOutlineExclamationTriangle,
            iconBg: "bg-red-100/80",
            iconColor: "text-red-600",
            buttonBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        },
        info: {
            icon: HiOutlineInformationCircle,
            iconBg: "bg-brand-100",
            iconColor: "text-brand-600",
            buttonBg: "bg-brand-600 hover:bg-brand-700 focus:ring-brand-500",
        },
        success: {
            icon: HiOutlineCheckCircle,
            iconBg: "bg-emerald-100/80",
            iconColor: "text-emerald-600",
            buttonBg: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
        },
        form: {
            icon: CustomIcon || HiOutlineInformationCircle,
            iconBg: "bg-brand-100",
            iconColor: "text-brand-600",
            buttonBg: "bg-brand-600 hover:bg-brand-700 focus:ring-brand-500",
        },
    };

    const config = typeConfig[type] || typeConfig.danger;
    const Icon = CustomIcon || config.icon;

    const confirmShadow =
        type === "danger"
            ? "shadow-red-500/20"
            : type === "success"
                ? "shadow-emerald-500/20"
                : "shadow-brand-500/20";

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <DialogPanel
                        transition
                        className="glass-panel relative transform overflow-hidden rounded-2xl text-left shadow-2xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-md data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
                    >
                        <div className="px-6 pb-6 pt-6">
                            <div className="sm:flex sm:items-start">
                                <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10 ring-4 ring-white/70 shadow-sm`}>
                                    <Icon aria-hidden="true" className={`h-6 w-6 ${config.iconColor}`} />
                                </div>
                                <div className="mt-4 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <DialogTitle
                                        as="h3"
                                        className="text-lg font-semibold text-slate-900 leading-6"
                                    >
                                        {title}
                                    </DialogTitle>
                                    <div className="mt-2">
                                        {message && (
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                {message}
                                            </p>
                                        )}
                                        {children}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {showFooter && (
                            <div className="bg-white/70 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6 border-t border-white/70">
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className={`inline-flex w-full justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${confirmShadow} transition-all transform hover:-translate-y-0.5 sm:ml-3 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.buttonBg}`}
                                >
                                    {confirmText || "Confirm"}
                                </button>
                                <button
                                    type="button"
                                    data-autofocus
                                    onClick={onClose}
                                    className="glass-panel mt-3 inline-flex w-full justify-center rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:text-slate-900 transition-colors sm:mt-0 sm:w-auto"
                                >
                                    {cancelText || "Cancel"}
                                </button>
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </div >
        </Dialog >
    );
}
