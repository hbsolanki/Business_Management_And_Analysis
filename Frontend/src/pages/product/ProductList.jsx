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
        toggleProductStatus,
        loadMore,
        hasMore,
        loadingMore,
        applyFilters,
    } = useProducts();

    const {
        categories,
        loading: loadingCategories,
        loadMore: loadMoreCategories,
        hasMore: hasMoreCategories,
        loadingMore: loadingMoreCategories,
        openAdd,
        openEdit,
        removeCategory,
        CategoryModalUI,
    } =
        useCategories();

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null,
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div>
                    <Suspense fallback={<div className="h-10 rounded-lg bg-slate-100 animate-pulse"></div>}>
                        <ProductHeader />
                    </Suspense>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <Suspense fallback={<div className="h-20 rounded-lg bg-slate-100 animate-pulse"></div>}>
                        <CategoryList
                            categories={categories}
                            loading={loadingCategories}
                            hasMore={hasMoreCategories}
                            loadingMore={loadingMoreCategories}
                            onLoadMore={loadMoreCategories}
                            onAdd={openAdd}
                            onEdit={openEdit}
                            onDelete={(id) => openDeleteModal("CATEGORY", id)}
                        />
                    </Suspense>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    <Suspense fallback={<div className="h-20 rounded-lg bg-slate-100 animate-pulse"></div>}>
                        <ProductFilters categories={categories} onApply={applyFilters} />
                    </Suspense>

                    <Suspense
                        fallback={
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                            </div>
                        }
                    >
                        <ProductSection
                            products={products}
                            loading={loading}
                            expandedId={expandedId}
                            toggleRead={toggleRead}
                            onDeleteProduct={(id) => openDeleteModal("PRODUCT", id)}
                            onToggleStatus={toggleProductStatus}
                            loadMore={loadMore}
                            hasMore={hasMore}
                            loadingMore={loadingMore}
                            showFinancials
                        />
                    </Suspense>
                </section>
            </main>

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
