import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaBell, FaArrowLeft } from 'react-icons/fa';
import ReminderForm from '@/features/reminder/components/ReminderForm';
import ProtectedHeader from "@/components/layout/ProtectedHeader";

const ReminderEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const handleComplete = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50 font-sans">
            <ProtectedHeader />

            <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Back button */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                        <FaArrowLeft size={10} /> Back to Reminders
                    </button>
                </div>

                {/* Edit Form Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                            <FaBell size={14} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Modify Alert Schedule</h3>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Automated Alert System</p>
                        </div>
                    </div>

                    <ReminderForm 
                        isEmbed={true} 
                        id={id ? parseInt(id, 10) : null}
                        onComplete={handleComplete} 
                    />
                </div>
            </main>
        </div>
    );
};

export default ReminderEdit;
