import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FaTimes, FaComments } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import UserList from "@/components/ui/UserList";

import { useDispatch } from "react-redux";
import { setChatPreferredUser } from "@/redux/slices/quickActionsSlice";

export default function ChatUserModal({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/business/users/");
            if (Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = (id) => {
        dispatch(setChatPreferredUser(id));
        navigate(`/chat?userId=${id}`);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2"
                                    >
                                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                            <FaComments size={20} />
                                        </div>
                                        Start a Chat
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100 outline-none"
                                    >
                                        <FaTimes size={20} />
                                    </button>
                                </div>

                                <div className="mt-2 min-h-[400px] max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        <div className="flex justify-center items-center h-48">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                        </div>
                                    ) : (
                                        <UserList
                                            users={users}
                                            type="EMPLOYEE" // Generic type for list
                                            onChat={handleChat}
                                            emptyText="No users found to chat with."
                                            // Disable Edit/Delete/View if we only want chat selection
                                            onView={null}
                                            onEdit={null}
                                            onDelete={null}
                                        />
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
