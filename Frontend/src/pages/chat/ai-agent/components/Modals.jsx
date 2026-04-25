import React from "react";
import Modal from "@/components/ui/Modal";

export function EditSessionModal({ isOpen, onClose, onConfirm, editTitle, setEditTitle, isProcessing }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Insight Chat">
      <div className="p-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Chat Title
        </label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Enter new title..."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-50"
          autoFocus
        />
        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!editTitle.trim() || isProcessing}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            {isProcessing ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteSessionModal({ isOpen, onClose, onConfirm, isProcessing }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete History">
      <div className="p-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-700">
          Are you sure you want to delete this session?
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">
          This action cannot be undone. All insights and messages in this chat will be permanently removed.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-200"
          >
            Keep Chat
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-rose-700 disabled:opacity-50"
          >
            {isProcessing ? "Deleting..." : "Delete Chat"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
