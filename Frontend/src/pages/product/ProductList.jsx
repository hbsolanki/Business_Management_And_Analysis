import { useState } from "react";
import { useProducts } from "@/features/product/hooks/useProducts";
import { useCategories } from "@/features/product/hooks/useCategories";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import Modal from "@/components/ui/Modal";
import { FaBox, FaTags } from "react-icons/fa";

import ProductHeader from "@/features/product/components/product/ProductHeader.jsx";
import ProductFilters from "@/features/product/components/product/ProductFilters";
import ProductSection from "@/features/product/components/product/ProductSection";
import CategoryList from "@/features/product/components/Category/CategoryList";

export default function ProductList() {
    const {
        products,
        loading,
        expandedId,
        toggleRead,
        removeProduct,
        loadMore,
        hasMore,
        loadingMore,
        applyFilters,
    } = useProducts();

    const { categories, openAdd, openEdit, removeCategory, CategoryModalUI } =
        useCategories();

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null, // "PRODUCT" or "CATEGORY"
        id: null,
    });

    const openDeleteModal = (type, id) => {
        setDeleteModal({ isOpen: true, type, id });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ ...deleteModal, isOpen: false });
    };

    const handleConfirmDelete = async () => {
        const { type, id } = deleteModal;
        if (!type || !id) return;

        if (type === "PRODUCT") {
            await removeProduct(id);
        } else if (type === "CATEGORY") {
            await removeCategory(id);
        }
        closeDeleteModal();
    };

    return (
        <>
            <ProtectedHeader />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                <ProductHeader />

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <CategoryList
                        categories={categories}
                        onAdd={openAdd}
                        onEdit={openEdit}
                        onDelete={(id) => openDeleteModal("CATEGORY", id)}
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <ProductFilters categories={categories} onApply={applyFilters} />

                    <ProductSection
                        products={products}
                        loading={loading}
                        expandedId={expandedId}
                        toggleRead={toggleRead}
                        onDeleteProduct={(id) => openDeleteModal("PRODUCT", id)}
                        loadMore={loadMore}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                    />
                </div>
            </div>

            {CategoryModalUI}

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                title={deleteModal.type === "PRODUCT" ? "Delete Product" : "Delete Category"}
                message={`Are you sure you want to delete this ${deleteModal.type === "PRODUCT" ? "product" : "category"}? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                icon={deleteModal.type === "PRODUCT" ? FaBox : FaTags}
            />
        </>
    );
}
