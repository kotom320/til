import { createContext, useContext } from "react";

export const CategoryContext = createContext<string[]>([]);

export const useCategories = () => useContext(CategoryContext);
