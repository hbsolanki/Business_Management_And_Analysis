import { useState } from "react";
import { FaTimes, FaPlus, FaMinus, FaSearch } from "react-icons/fa";

function QuickActionsConfigModal({ isOpen, onClose, availableActions, activeActionIds, onToggleAction, themeColor = "blue" }) {
    const [searchQuery, setSearchQuery] = useState("");
    if (!isOpen) return null;

    const themeColors = {
        blue: {
            border: 'border-blue-500',
            bg: 'bg-blue-50/50',
            iconBg: 'bg-blue-100 text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            ring: 'focus:ring-blue-500',
            toggle: 'bg-blue-600 border-blue-600'
        },
        purple: {
            border: 'border-purple-500',
            bg: 'bg-purple-50/50',
            iconBg: 'bg-purple-100 text-purple-600',
            button: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
            ring: 'focus:ring-purple-500',
            toggle: 'bg-purple-600 border-purple-600'
        },
        green: {
            border: 'border-green-500',
            bg: 'bg-green-50/50',
            iconBg: 'bg-green-100 text-green-600',
            button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
            ring: 'focus:ring-green-500',
            toggle: 'bg-green-600 border-green-600'
        }
    };

    const theme = themeColors[themeColor] || themeColors.blue;

    const filteredActions = Object.values(availableActions).filter(action =>
        action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.desc?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                                        Configure Quick Actions
                                    </h3>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <FaTimes />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Select the actions you want to see in your quick actions menu.
                                </p>

                                {/* Search Bar */}
                                <div className="relative mb-4">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search actions..."
                                        className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent transition-all sm:text-sm`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {filteredActions.length > 0 ? (
                                        filteredActions.map((action) => {
                                            const isActive = activeActionIds.includes(action.id);
                                            return (
                                                <div
                                                    key={action.id}
                                                    onClick={() => onToggleAction(action.id)}
                                                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isActive ? `${theme.border} ${theme.bg}` : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isActive ? theme.iconBg : 'bg-gray-100 text-gray-500'}`}>
                                                            {action.icon}
                                                        </div>
                                                        <span className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                                                            {action.label}
                                                        </span>
                                                    </div>
                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${isActive ? `${theme.toggle} text-white` : 'bg-white border-gray-300 text-gray-300'}`}>
                                                        {isActive ? <FaMinus size={10} /> : <FaPlus size={10} />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No actions found matching "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2.5 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${theme.button}`}
                            onClick={onClose}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default QuickActionsConfigModal;
