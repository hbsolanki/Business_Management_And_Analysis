import { useState, useEffect } from "react";
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi2";
import { FaLayerGroup } from "react-icons/fa";
import toast from "react-hot-toast";
import costCategoryService from "../services/costCategoryService";
import CostCategoryModal from "./CostCategoryModal";
import Modal from "@/components/ui/Modal";

export default function CostCategoryList() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await costCategoryService.getAll();
            setCategories(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load cost categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleEdit = (category) => {
        setSelectedCategory(category);
        setShowModal(true);
    };

    const confirmDelete = (category) => {
        setCategoryToDelete(category);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!categoryToDelete) return;

        try {
            await costCategoryService.delete(categoryToDelete.id);
            setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
            toast.success("Category deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete category");
        } finally {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
        }
    };

    const handleSaved = (savedCategory) => {
        if (selectedCategory) {
            setCategories(prev => prev.map(c => c.id === savedCategory.id ? savedCategory : c));
        } else {
            setCategories(prev => [...prev, savedCategory]);
        }
        setShowModal(false);
        setSelectedCategory(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                            <FaLayerGroup size={24} />
                        </div>
                        Cost Categories
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">
                        Organize your business expenses into clear categories for better tracking.
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedCategory(null); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white px-5 py-2.5 rounded-xl hover:from-brand-700 hover:to-brand-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                    <HiOutlinePlus className="w-5 h-5" />
                    <span>Add New Category</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
                </div>
            ) : categories.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto mt-10">
                    <div className="bg-white/70 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaLayerGroup className="text-gray-300 text-4xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
                    <p className="text-gray-500 mb-6">Start by creating your first cost category to track expenses.</p>
                    <button
                        onClick={() => { setSelectedCategory(null); setShowModal(true); }}
                        className="text-brand-600 font-bold hover:text-brand-700 hover:underline"
                    >
                        Create Category
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categories.map((category) => (
                        <div key={category.id} className="glass-panel group rounded-2xl p-6 hover:shadow-xl hover:border-brand-100 transition-all duration-300 relative flex flex-col h-full">
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-brand-50 text-brand-700 p-2.5 rounded-lg">
                                        <FaLayerGroup className="w-5 h-5" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <HiOutlinePencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(category)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <HiOutlineTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1" title={category.name}>
                                    {category.name}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                                    {category.description || <span className="italic text-gray-300">No description provided</span>}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Add/Edit */}
            {showModal && (
                <CostCategoryModal
                    category={selectedCategory}
                    onClose={() => { setShowModal(false); setSelectedCategory(null); }}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Category"
                message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}
