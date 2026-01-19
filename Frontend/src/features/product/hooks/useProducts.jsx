import { useEffect, useState, useCallback } from "react";
import { productService } from "@/features/product/services/productService";

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

      setProducts((prev) =>
        replace ? res.data.results : [...prev, ...res.data.results]
      );

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

  return {
    products,
    loading,
    expandedId,
    toggleRead,
    toggleRead,
    removeProduct,

    loadMore,
    hasMore: Boolean(nextCursor),
    loadingMore,

    applyFilters,
  };
}
