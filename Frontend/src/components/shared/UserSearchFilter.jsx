import { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import api from "@/services/api";

const UserSearchFilter = ({ label, placeholder, value, onChange }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const wrapperRef = useRef(null);

    // Initial load logic - if a value is passed, ideally we'd fetch that user 
    // to display their name, but since it's just a filter ID, we can just show "User Selected"
    // or handle it by resetting the search if value is cleared.
    useEffect(() => {
        if (!value) {
            setSelectedUser(null);
            setSearchQuery("");
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery && isOpen && !selectedUser) {
                setLoading(true);
                try {
                    const response = await api.get(`/user/?search=${searchQuery}`);
                    setSearchResults(response.data?.results || response.data || []);
                } catch (error) {
                    console.error("Search failed", error);
                    setSearchResults([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, selectedUser]);

    const getUserInitials = (user) => {
        const first = user.first_name?.[0] || "";
        const last = user.last_name?.[0] || "";
        return `${first}${last}`.trim().toUpperCase() || user.username?.[0]?.toUpperCase() || "U";
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearchQuery(`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username);
        setIsOpen(false);
        onChange(user.id);
    };

    const handleClear = () => {
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        onChange("");
    };

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-5 pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <FaSearch size={12} />
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                        if (selectedUser) {
                            setSelectedUser(null);
                            onChange("");
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-10 py-2.5 text-sm font-medium leading-6 tracking-normal text-slate-900 caret-slate-900 outline-none transition-all placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
                
                {loading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {selectedUser && !loading && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <FaTimes size={12} />
                    </button>
                )}
            </div>

            {isOpen && searchResults.length > 0 && !selectedUser && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {searchResults.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors"
                        >
                            {user.profile_picture ? (
                                <img
                                    src={user.profile_picture}
                                    alt={user.username}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 tracking-wider">
                                    {getUserInitials(user)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                    {user.first_name} {user.last_name}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest truncate">
                                    {user.role || 'USER'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && searchQuery && !loading && searchResults.length === 0 && !selectedUser && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No users found</p>
                </div>
            )}
        </div>
    );
};

export default UserSearchFilter;
