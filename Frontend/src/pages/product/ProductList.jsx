import { useState, lazy, Suspense } from "react";
import { useProducts } from "@/features/product/hooks/useProducts";
import { useCategories } from "@/features/product/hooks/useCategories";
import ProtectedHeader from "@/components/layout/ProtectedHeader";
import { FaBox, FaTags } from "react-icons/fa";

const Modal = lazy(() => import("@/components/ui/Modal"));
const ProductHeader = lazy(() => import("@/features/product/components/product/ProductHeader.jsx"));
const ProductFilters = lazy(() => import("@/features/product/components/product/ProductFilters"));
const ProductSection = lazy(() => import("@/features/product/components/product/ProductSection"));
const CategoryList = lazy(() => import("@/features/product/components/Category/CategoryList"));

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
                <Suspense fallback={<div className="h-10 bg-gray-100 rounded animate-pulse"></div>}>
                    <ProductHeader />
                </Suspense>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <Suspense fallback={<div className="h-20 bg-gray-100 rounded animate-pulse"></div>}>
                        <CategoryList
                            categories={categories}
                            onAdd={openAdd}
                            onEdit={openEdit}
                            onDelete={(id) => openDeleteModal("CATEGORY", id)}
                        />
                    </Suspense>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <Suspense fallback={<div className="h-20 bg-gray-100 rounded animate-pulse"></div>}>
                        <ProductFilters categories={categories} onApply={applyFilters} />
                    </Suspense>

                    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
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
                    </Suspense>
                </div>
            </div>

            {CategoryModalUI}

            <Suspense fallback={null}>
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
            </Suspense>
        </>
    );
}
