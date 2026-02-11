import { all } from "../index";

export type CategoryInput = {
  id: number;
  name: string;
  type: "depense" | "entree" | "event";
};

export const listeCategories = async () => {
  return await all<{
    id: number;
    name: string;
    type: "depense" | "entree" | "event";
  }>("SELECT * FROM categories ORDER BY name ASC;");
};
