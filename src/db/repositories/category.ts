import { all, getOne, runSql } from "../index";

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

export const createCategory = async ({
  name,
  type,
}: {
  name: string;
  type: "depense" | "entree" | "event";
}) => {
  const existing = await getOne(
    `SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND type = ?`,
    [name.trim(), type],
  );

  if (existing) {
    return false;
  }

  await runSql(`INSERT INTO categories (name, type) VALUES (?, ?)`, [
    name.trim(),
    type,
  ]);

  return true;
};

export const updateCategory = async ({
  id,
  name,
  type,
}: {
  id: number;
  name: string;
  type: "depense" | "entree" | "event";
}) => {
  const existing = await getOne(
    `SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND type = ? AND id != ?`,
    [name.trim(), type, id],
  );

  if (existing) {
    return false;
  }

  await runSql(`UPDATE categories SET name = ?, type = ? WHERE id = ?`, [
    name.trim(),
    type,
    id,
  ]);

  return true;
};

export const deleteCategory = async (id: number) => {
  await runSql(`DELETE FROM categories WHERE id = ?`, [id]);
};
