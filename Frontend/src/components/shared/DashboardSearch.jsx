import { useState, useEffect, useRef, useMemo } from "react";
import { FaSearch, FaArrowRight, FaTimes } from "react-icons/fa";

export default function DashboardSearch({
    items = [],
    onNavigate,
    placeholder = "Search...",
    iconMap = {},
    defaultIcon: DefaultIcon
}) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query.trim().toLowerCase());
        }, 200);
        return () => clearTimeout(timer);
    }, [query]);

    // Filtering
    const filteredItems = useMemo(() => {
        if (!debouncedQuery) return [];
        return items.filter((item) => {
            const haystack = `${item.label} ${item.desc} ${item.group || ""} ${item.path || ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
            return haystack.includes(debouncedQuery);
        });
    }, [items, debouncedQuery]);

    // Keyboard Navigation
    useEffect(() => {
        if (filteredItems.length === 0) {
            setSelectedIndex(-1);
        } else {
            // Reset selection when results change, or keep 0 if already selecting
            setSelectedIndex((prev) => (prev === -1 ? 0 : Math.min(prev, filteredItems.length - 1)));
        }
    }, [filteredItems.length]);

    const handleKeyDown = (e) => {
        if (!isOpen || filteredItems.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
                handleSelect(filteredItems[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (item) => {
        if (onNavigate) {
            onNavigate(item);
        }
        setQuery("");
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Open dropdown on input focus or text change
    useEffect(() => {
        if (debouncedQuery) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [debouncedQuery]);

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
            {/* Input Wrapper */}
            <div className="relative group">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (debouncedQuery) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-10 py-4 round-2xl md:rounded-2xl bg-white/95 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-400/20 shadow-lg text-base transition-all border border-transparent focus:border-brand-200"
                    style={{ borderRadius: "1rem" }} // Explicit border radius just in case
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden py-2 border border-gray-100/50 animate-fade-in-up origin-top">
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center border-b border-gray-50 pb-2 mb-1">
                        <span>Search Results ({filteredItems.length})</span>
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">ESC to close</span>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="px-6 py-10 text-center text-gray-500">
                            <p className="text-sm">{`No matches found for "${query}".`}</p>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {filteredItems.map((item, index) => {
                                const isSelected = index === selectedIndex;
                                const Icon = iconMap[item.icon] || DefaultIcon;

                                return (
                                    <button
                                        key={`${item.path}-${index}`}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-all duration-200 ${isSelected
                                                ? "bg-brand-50 border-l-4 border-brand-500 pl-3"
                                                : "hover:bg-gray-50 border-l-4 border-transparent pl-4"
                                            }`}
                                    >
                                        <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform ${isSelected ? "scale-110" : ""} ${item.bg || "bg-gray-100"} ${item.color || "text-gray-600"}`}>
                                            {Icon && <Icon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${isSelected ? "text-brand-900" : "text-gray-900"}`}>
                                                {item.label}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                                        </div>
                                        <FaArrowRight className={`ml-auto flex-shrink-0 transition-opacity ${isSelected ? "opacity-100 text-brand-400" : "opacity-0"}`} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Backdrop Overlay (Optional but good for UX) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-[-1] md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </div>
    );
}
