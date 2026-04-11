import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import OwnerHeader from "@/components/layout/OwnerHeader";
import Modal from "@/components/ui/Modal";
import { branchService } from "@/features/business/services/branchService";
import {
  FaCodeBranch,
  FaCheckCircle,
  FaEdit,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaTrash,
  FaTimes,
  FaEllipsisV,
  FaPowerOff,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";
import { createPortal } from "react-dom";
import { useRef, useLayoutEffect } from "react";
const normalizeBranches = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function BranchList() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchToDelete, setBranchToDelete] = useState(null);

  const [actionsMenu, setActionsMenu] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, left: 0, opacity: 0 });
  const actionsMenuRef = useRef(null);

  const navigate = useNavigate();

  const fetchBranches = async (name = "") => {
    setLoading(true);
    try {
      const res = await branchService.list(name ? { name } : {});
      setBranches(normalizeBranches(res.data));
    } catch {
      toast.error("Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBranches(searchTerm);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchBranches(searchTerm);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  useEffect(() => {
    const closeMenuOnOutsideClick = (event) => {
      const target = event?.target;
      if (target instanceof Element && target.closest("[data-actions-trigger]")) return;
      if (target instanceof Element && target.closest("[data-actions-floating]")) return;
      setActionsMenu(null);
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!actionsMenu) return;
    const closeMenu = () => setActionsMenu(null);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [actionsMenu]);

  useLayoutEffect(() => {
    if (!actionsMenu || !actionsMenuRef.current) return;

    const menuEl = actionsMenuRef.current;
    const menuRect = menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;
    const anchor = actionsMenu.anchorRect;

    let top = anchor.bottom + padding;
    if (top + menuRect.height > viewportHeight - padding) {
      top = Math.max(padding, anchor.top - menuRect.height - padding);
    }

    let left = anchor.right - menuRect.width;
    if (left < padding) left = padding;
    if (left + menuRect.width > viewportWidth - padding) {
      left = viewportWidth - menuRect.width - padding;
    }

    setActionsMenuPosition({ top, left, opacity: 1 });
  }, [actionsMenu]);

  const toggleBranchStatus = async (branch) => {
    try {
      const newStatus = !branch.is_active;
      const res = await branchService.update(branch.id, { is_active: newStatus });
      toast.success(`Branch marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setBranches((prev) => prev.map((b) => b.id === branch.id ? { ...b, is_active: newStatus, ...res.data } : b));
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        || err.response?.data?.message
        || "Failed to update branch status";
      toast.error(errorMessage);
    } finally {
      setActionsMenu(null);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    try {
      await branchService.delete(branchToDelete);
      setBranches((prev) => prev.filter((b) => b.id !== branchToDelete));
      toast.success("Branch deleted successfully");
      setBranchToDelete(null);
    } catch {
      toast.error("Failed to delete branch");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <OwnerHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FaCodeBranch size={18} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Branches</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage all branch locations in one place.
                </p>
              </div>
            </div>

            <Link
              to="/business/branch/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
            >
              <FaPlus size={12} />
              Add Branch
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <div className="relative w-full md:max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by branch name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <FaTimes size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-slate-500">
              {branches.length} branch{branches.length !== 1 ? "es" : ""}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading branches...</p>
          </section>
        ) : branches.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <FaCodeBranch />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No branches found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? "Try a different search keyword." : "Create your first branch to get started."}
            </p>
            {!searchTerm ? (
              <Link
                to="/business/branch/new"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <FaPlus size={11} />
                Add Branch
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <article
                key={branch.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 truncate">{branch.name}</h2>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Branch ID: {branch.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      {branch.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                          <FaCheckCircle size={10} />
                          Main
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${branch.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        data-actions-trigger
                        onClick={(event) => {
                          event.stopPropagation();
                          const anchorRect = event.currentTarget.getBoundingClientRect();
                          setActionsMenuPosition((prev) => ({ ...prev, opacity: 0 }));
                          setActionsMenu((prev) => (
                            prev && prev.kind === "branch" && Number(prev.id) === Number(branch.id)
                              ? null
                              : { kind: "branch", id: branch.id, branch: branch, anchorRect }
                          ));
                        }}
                        className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all flex items-center justify-center -mr-1"
                      >
                        <FaEllipsisV size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="mt-0.5 text-slate-400 shrink-0" />
                    <p className="line-clamp-2">
                      {(() => {
                        const a = branch.address || {};
                        return [
                          a.address_line_1,
                          a.address_line_2,
                          a.city_name,
                          a.state_name,
                          a.country_name,
                          a.pin_code,
                        ].filter(Boolean).join(", ") || "Address not provided";
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhoneAlt className="text-slate-400 shrink-0" size={12} />
                    <p>{branch.contact_number || "Contact not provided"}</p>
                  </div>
                </div>


              </article>
            ))}
          </section>
        )}
      </main>

      {actionsMenu && (
        createPortal(
          <div
            ref={actionsMenuRef}
            data-actions-floating
            className="fixed z-[80] w-48 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: actionsMenuPosition.top,
              left: actionsMenuPosition.left,
              opacity: actionsMenuPosition.opacity,
            }}
          >
            {actionsMenu.kind === "branch" && actionsMenu.branch && (
              <div className="space-y-1">
                <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Actions</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActionsMenu(null);
                    navigate(`/business/branch/${actionsMenu.branch.id}/edit`);
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                >
                  <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <FaEdit size={12} />
                  </div>
                  Edit Branch
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleBranchStatus(actionsMenu.branch);
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${actionsMenu.branch.is_active
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                    }`}>
                    <FaPowerOff size={12} />
                  </div>
                  {actionsMenu.branch.is_active ? 'Inactive' : 'Active'} Branch
                </button>

                {!actionsMenu.branch.is_default && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActionsMenu(null);
                      setBranchToDelete(actionsMenu.branch.id);
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <FaTrash size={12} />
                    </div>
                    Delete Branch
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )
      )}

      <Modal
        isOpen={Boolean(branchToDelete)}
        onClose={() => setBranchToDelete(null)}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete Branch"
        type="danger"
      />
    </div>
  );
}
