import { useCallback, useState } from "react";

export function useModalQueue() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);

  const closeModal = useCallback(() => {
    setActiveModal(null);

    // Quand le modal est fermé, on vérifie s'il y en a en attente
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const next = prev[0];
          setActiveModal(next);
          return prev.slice(1);
        }
        return prev;
      });
    }, 200); // délai minimum pour transition RN
  }, []);

  const openModal = useCallback(
    (name: string) => {
      setQueue((prev) => {
        if (!activeModal) {
          // si aucun modal n'est ouvert = ouvrir immédiatement
          setActiveModal(name);
          return prev;
        } else {
          // sinon, mettre dans la file
          return [...prev, name];
        }
      });
    },
    [activeModal],
  );

  const isVisible = useCallback(
    (name: string) => activeModal === name,
    [activeModal],
  );

  return {
    activeModal,
    openModal,
    closeModal,
    isVisible,
  };
}
