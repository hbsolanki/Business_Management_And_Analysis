import { useEffect, useState } from "react";
import { productService } from "@/features/product/services/productService";
import CategoryModal from "../components/Category/CategoryModal";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    productService.getCategories().then(res => setCategories(res.data));
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
        setCategories(prev =>
          editing
            ? prev.map(c => c.id === newCat.id ? newCat : c)
            : [...prev, newCat]
        );
        setOpen(false);
      }}
    />
  ) : null;

  return { categories, openAdd, openEdit, removeCategory, CategoryModalUI };
}
