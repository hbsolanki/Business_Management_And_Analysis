import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import {
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";

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
            icon: ExclamationTriangleIcon,
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            buttonBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        },
        info: {
            icon: InformationCircleIcon,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            buttonBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        },
        success: {
            icon: CheckCircleIcon,
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            buttonBg: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
        },
        form: {
            icon: CustomIcon || InformationCircleIcon,
            iconBg: "bg-indigo-100",
            iconColor: "text-indigo-600",
            buttonBg: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
        },
    };

    const config = typeConfig[type] || typeConfig.danger;
    const Icon = CustomIcon || config.icon;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <DialogPanel
                        transition
                        className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-md data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95 border border-white/50"
                    >
                        <div className="bg-white px-6 pb-6 pt-6">
                            <div className="sm:flex sm:items-start">
                                <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10 ring-4 ring-white shadow-sm`}>
                                    <Icon aria-hidden="true" className={`h-6 w-6 ${config.iconColor}`} />
                                </div>
                                <div className="mt-4 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <DialogTitle
                                        as="h3"
                                        className="text-lg font-bold text-gray-900 leading-6"
                                    >
                                        {title}
                                    </DialogTitle>
                                    <div className="mt-2">
                                        {message && (
                                            <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                                {message}
                                            </p>
                                        )}
                                        {children}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {showFooter && (
                            <div className="bg-gray-50/80 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className={`inline-flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-${type === 'danger' ? 'red' : 'blue'}-500/20 transition-all transform hover:-translate-y-0.5 sm:ml-3 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.buttonBg}`}
                                >
                                    {confirmText || "Confirm"}
                                </button>
                                <button
                                    type="button"
                                    data-autofocus
                                    onClick={onClose}
                                    className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors sm:mt-0 sm:w-auto"
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
