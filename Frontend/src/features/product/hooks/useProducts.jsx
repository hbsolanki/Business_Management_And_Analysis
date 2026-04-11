import { useEffect, useState } from "react";
import { productService } from "@/features/product/services/productService";
import { toast } from "react-hot-toast";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [nextCursor, setNextCursor] = useState(null);
  const [query, setQuery] = useState({}); // 🔑 server-side filters

  /* ---------- Fetch products ---------- */
  const fetchProducts = async (url, replace = false) => {
    try {
      replace ? setLoading(true) : setLoadingMore(true);

      const res = await productService.getAll(url);

      setProducts((prev) => {
        if (replace) return res.data.results;
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueItems = res.data.results.filter((item) => !existingIds.has(item.id));
        return [...prev, ...uniqueItems];
      });

      setNextCursor(res.data.next);
    } catch (err) {
      console.error("Product fetch failed", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /* ---------- Initial + Filtered load ---------- */
  useEffect(() => {
    const params = new URLSearchParams(query).toString();
    fetchProducts(`/product/?${params}`, true);
  }, [query]);

  /* ---------- Infinite scroll ---------- */
  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    fetchProducts(nextCursor);
  };

  /* ---------- Apply Filters (GO button) ---------- */
  const applyFilters = ({ name, sku, product_category }) => {
    const q = {};

    if (name) q.name = name;
    if (sku) q.sku = sku;
    if (product_category) q.product_category = product_category;
    setProducts([]); // reset data
    setNextCursor(null); // reset cursor
    setQuery(q); // trigger fetch
  };

  /* ---------- UI helpers ---------- */
  const toggleRead = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  /* ---------- Delete ---------- */
  const removeProduct = async (id) => {
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /* ---------- Toggle Status ---------- */
  const toggleProductStatus = async (product) => {
    try {
      const newStatus = product.is_active === false ? true : false;
      const res = await productService.update(product.id, { is_active: newStatus });
      toast.success(`Product marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, is_active: newStatus, ...res.data } : p)
      );
      return true;
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.detail
        || err.response?.data?.message
        || err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.branch_id?.[0]
        || "Failed to update product status";
      toast.error(errorMessage);
      return false;
    }
  };

  return {
    products,
    loading,
    expandedId,
    toggleRead,
    removeProduct,
    toggleProductStatus,

    loadMore,
    hasMore: Boolean(nextCursor),
    loadingMore,

    applyFilters,
  };
}
