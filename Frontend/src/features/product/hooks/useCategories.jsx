import { useEffect, useState } from "react";
import { productService } from "@/features/product/services/productService";
import CategoryModal from "../components/Category/CategoryModal";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const normalizeCategoryPayload = (payload) => {
    if (Array.isArray(payload)) {
      return { results: payload, next: null };
    }
    if (payload && Array.isArray(payload.results)) {
      return { results: payload.results, next: payload.next || null };
    }
    return { results: [], next: null };
  };

  const fetchCategories = async (url = "/product/category/", replace = false) => {
    try {
      replace ? setLoading(true) : setLoadingMore(true);
      const res = await productService.getCategories(url);
      const { results, next } = normalizeCategoryPayload(res.data);

      setCategories((prev) => {
        if (replace) return results;
        const existingIds = new Set(prev.map((category) => category.id));
        const uniqueNext = results.filter((category) => !existingIds.has(category.id));
        return [...prev, ...uniqueNext];
      });
      setNextCursor(next);
    } catch {
      if (replace) {
        setCategories([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCategories("/product/category/", true);
  }, []);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setOpen(true);
  };

  const removeCategory = async (id) => {
    try {
      await productService.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const CategoryModalUI = open ? (
    <CategoryModal
      category={editing}
      onClose={() => setOpen(false)}
      onSaved={(newCat) => {
        setCategories((prev) => {
          if (editing) {
            return prev.map((category) => (category.id === newCat.id ? newCat : category));
          }

          if (prev.some((category) => category.id === newCat.id)) {
            return prev.map((category) => (category.id === newCat.id ? newCat : category));
          }

          return [newCat, ...prev];
        });
        setOpen(false);
      }}
    />
  ) : null;

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    fetchCategories(nextCursor, false);
  };

  return {
    categories,
    loading,
    loadMore,
    hasMore: Boolean(nextCursor),
    loadingMore,
    openAdd,
    openEdit,
    removeCategory,
    CategoryModalUI,
  };
}
