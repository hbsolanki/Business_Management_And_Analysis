import { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes, FaUsers } from "react-icons/fa";
import api from "@/services/api";

const TaskGroupSearchFilter = ({ label, placeholder, value, onChange }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const wrapperRef = useRef(null);

    // If the value is cleared from outside, reset state
    useEffect(() => {
        if (!value) {
            setSelectedGroup(null);
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
            if (searchQuery && isOpen && !selectedGroup) {
                setLoading(true);
                try {
                    const response = await api.get(`/task/groups/?name=${searchQuery}`);
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
    }, [searchQuery, isOpen, selectedGroup]);

    const getGroupInitials = (group) => {
        return group.name ? group.name.substring(0, 2).toUpperCase() : "TG";
    };

    const handleSelectGroup = (group) => {
        setSelectedGroup(group);
        setSearchQuery(group.name);
        setIsOpen(false);
        onChange(group.id);
    };

    const handleClear = () => {
        setSelectedGroup(null);
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
                        if (selectedGroup) {
                            setSelectedGroup(null);
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

                {selectedGroup && !loading && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <FaTimes size={12} />
                    </button>
                )}
            </div>

            {isOpen && searchResults.length > 0 && !selectedGroup && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {searchResults.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => handleSelectGroup(group)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 tracking-wider">
                                {getGroupInitials(group)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                    {group.name}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5 truncate">
                                    <FaUsers size={9} className="text-slate-400" /> 
                                    {group.members?.length || 0} Members
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && searchQuery && !loading && searchResults.length === 0 && !selectedGroup && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No task groups found</p>
                </div>
            )}
        </div>
    );
};

export default TaskGroupSearchFilter;
