import { useState, useEffect, useRef, useCallback } from "react";
import { 
  FaTimes, 
  FaRobot, 
  FaColumns, 
  FaWindowRestore, 
  FaExpand
} from "react-icons/fa";

// Workspace Registry Helper
import { getWorkspaceDetails, renderWorkspaceContent } from "./workspaceRegistry";

const SidePanel = ({ isOpen, onClose, config }) => {
  const [width, setWidth] = useState(480);
  const [layoutMode, setLayoutMode] = useState("drawer"); // "drawer" | "modal" | "fullscreen"
  const isResizing = useRef(false);

  const startResize = useCallback((e) => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const resize = useCallback((e) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 380 && newWidth < window.innerWidth * 0.95) {
      setWidth(newWidth);
    }
  }, []);

  const stopResize = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [resize, stopResize]);

  // Adjust panel width dynamically depending on form content complexity and screen size
  useEffect(() => {
    if (!isOpen || !config?.type) return;

    if (window.innerWidth < 640) {
      // Mobile screen: occupy full width
      setWidth(window.innerWidth);
      return;
    }

    const wideTypes = [
      "add_purchase_order", 
      "edit_purchase_order", 
      "add_sales_order", 
      "edit_sales_order", 
      "add_invoice", 
      "edit_invoice",
      "generate_report",
      "view_plans"
    ];

    if (wideTypes.includes(config.type)) {
      const calculatedWidth = Math.min(1024, Math.floor(window.innerWidth * 0.85));
      setWidth(calculatedWidth);
    } else {
      const calculatedWidth = Math.min(520, Math.floor(window.innerWidth * 0.95));
      setWidth(calculatedWidth);
    }
  }, [isOpen, config?.type]);

  // Dynamically respond to window resizing to ensure 100% responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (!isOpen) return;
      if (window.innerWidth < 640) {
        setWidth(window.innerWidth);
      } else {
        setWidth((prev) => Math.min(prev, Math.floor(window.innerWidth * 0.95)));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const header = getWorkspaceDetails(config.type);

  const renderContent = () => {
    return renderWorkspaceContent(config);
  };

  const renderHeader = () => (
    <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md">
          {header.icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{header.title}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{header.subtitle}</p>
        </div>
      </div>

      {/* Layout Mode Switcher */}
      <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5 scale-90 origin-right">
        <button
          onClick={() => setLayoutMode("drawer")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
            layoutMode === "drawer"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <FaColumns size={10} />
          Drawer
        </button>
        <button
          onClick={() => setLayoutMode("modal")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
            layoutMode === "modal"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <FaWindowRestore size={10} />
          Modal
        </button>
        <button
          onClick={() => setLayoutMode("fullscreen")}
          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
            layoutMode === "fullscreen"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-400 hover:text-slate-900"
          }`}
        >
          <FaExpand size={10} />
          Fullscreen
        </button>
      </div>

      <button 
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all ml-2 shrink-0"
      >
        <FaTimes size={16} />
      </button>
    </header>
  );

  // Render centered modal mode
  if (layoutMode === "modal") {
    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          {renderHeader()}
          <div className="flex-1 overflow-y-auto bg-white">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Render edge-to-edge fullscreen focus mode
  if (layoutMode === "fullscreen") {
    return (
      <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in fade-in duration-200">
        {renderHeader()}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-7xl mx-auto py-6">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Default: Render side panel drawer layout mode
  return (
    <aside 
      style={{ width: isOpen ? `${width}px` : "0px" }}
      className={`fixed top-0 right-0 bottom-0 z-[110] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Resizing Handle */}
      <div 
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-slate-900/10 active:bg-slate-950/20 z-[120] transition-colors"
      />
      <div className="flex h-full flex-col">
        {renderHeader()}
        <div className="flex-1 overflow-y-auto bg-white">
          {renderContent()}
        </div>
      </div>
    </aside>
  );
};
export default SidePanel;
