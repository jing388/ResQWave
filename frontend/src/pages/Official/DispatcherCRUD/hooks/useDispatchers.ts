import { useCallback, useEffect, useState } from "react";
import {
    archiveDispatcher,
    createDispatcher,
    deleteDispatcherPermanently,
    getActiveDispatchers,
    getArchivedDispatchers,
    getDispatcher,
    restoreDispatcher,
    transformDispatcherDetailsResponse,
    transformDispatcherResponse,
    updateDispatcher,
} from "../api/dispatcherApi";
import type { Dispatcher, DispatcherDetails } from "../types";

export function useDispatchers() {
  const [activeDispatchers, setActiveDispatchers] = useState<Dispatcher[]>([]);
  const [archivedDispatchers, setArchivedDispatchers] = useState<Dispatcher[]>(
    [],
  );
  const [infoById, setInfoById] = useState<Record<string, DispatcherDetails>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active dispatchers
  const fetchActiveDispatchers = useCallback(async () => {
    try {
      setError(null);
      const response = await getActiveDispatchers();
      const transformedData = response.map(transformDispatcherResponse);
      setActiveDispatchers(transformedData);

      // Also store detailed info for each dispatcher
      const detailsMap: Record<string, DispatcherDetails> = {};
      response.forEach((dispatcher) => {
        detailsMap[dispatcher.id] =
          transformDispatcherDetailsResponse(dispatcher);
      });
      setInfoById((prev) => ({ ...prev, ...detailsMap }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch active dispatchers",
      );
      console.error("Error fetching active dispatchers:", err);
    }
  }, []);

  // Fetch archived dispatchers
  const fetchArchivedDispatchers = useCallback(async () => {
    try {
      setError(null);
      const response = await getArchivedDispatchers();
      const transformedData = response.map(transformDispatcherResponse);
      setArchivedDispatchers(transformedData);

      // Also store detailed info for archived dispatchers
      const detailsMap: Record<string, DispatcherDetails> = {};
      response.forEach((dispatcher) => {
        detailsMap[dispatcher.id] =
          transformDispatcherDetailsResponse(dispatcher);
      });
      setInfoById((prev) => ({ ...prev, ...detailsMap }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch archived dispatchers",
      );
      console.error("Error fetching archived dispatchers:", err);
    }
  }, []);

  // Fetch detailed info for a specific dispatcher
  const fetchDispatcherDetails = useCallback(
    async (id: string): Promise<DispatcherDetails | null> => {
      try {
        const response = await getDispatcher(id);
        const details = transformDispatcherDetailsResponse(response);

        // Update the infoById state
        setInfoById((prev) => ({ ...prev, [id]: details }));

        return details;
      } catch (err) {
        console.error(`Error fetching dispatcher ${id} details:`, err);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to fetch dispatcher ${id} details`,
        );
        return null;
      }
    },
    [],
  );

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchActiveDispatchers(),
          fetchArchivedDispatchers(),
        ]);
      } catch (err) {
        console.error("Error loading initial dispatcher data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchActiveDispatchers, fetchArchivedDispatchers]);

  // Create new dispatcher with optimistic updates
  const createNewDispatcher = useCallback(
    async (dispatcherData: {
      name: string;
      email: string;
      contactNumber: string;
    }) => {
      try {
        setError(null);

        // Create optimistic entry
        const tempId = `temp-${Date.now()}`;
        const optimisticDispatcher: Dispatcher = {
          id: tempId,
          name: dispatcherData.name,
          email: dispatcherData.email,
          contactNumber: dispatcherData.contactNumber,
          createdAt: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };

        // Add optimistic entry to the list
        setActiveDispatchers((prev) => [optimisticDispatcher, ...prev]);

        try {
          const result = await createDispatcher(dispatcherData);

          // Remove optimistic entry and refresh with real data
          setActiveDispatchers((prev) => prev.filter((d) => d.id !== tempId));
          await fetchActiveDispatchers();

          return result;
        } catch (apiError) {
          // Remove optimistic entry on failure
          setActiveDispatchers((prev) => prev.filter((d) => d.id !== tempId));
          throw apiError;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create dispatcher";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchActiveDispatchers],
  );

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchActiveDispatchers(), fetchArchivedDispatchers()]);
    } catch (err) {
      console.error("Error refreshing dispatcher data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveDispatchers, fetchArchivedDispatchers]);

  // Archive dispatcher with optimistic updates
  const archiveDispatcherById = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);

        // Find the dispatcher to archive
        const dispatcherToArchive = activeDispatchers.find((d) => d.id === id);
        if (!dispatcherToArchive) {
          throw new Error("Dispatcher not found");
        }

        // Store original state for rollback
        const originalActiveDispatchers = [...activeDispatchers];
        const originalArchivedDispatchers = [...archivedDispatchers];

        // Optimistic update: move from active to archived
        setActiveDispatchers((prev) => prev.filter((d) => d.id !== id));
        setArchivedDispatchers((prev) => [dispatcherToArchive, ...prev]);

        try {
          await archiveDispatcher(id);
          // Success - optimistic update was correct, no need to refresh
        } catch (apiError) {
          // Rollback optimistic update on failure
          setActiveDispatchers(originalActiveDispatchers);
          setArchivedDispatchers(originalArchivedDispatchers);
          throw apiError;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to archive dispatcher",
        );
        console.error("Error archiving dispatcher:", err);
        throw err;
      }
    },
    [activeDispatchers, archivedDispatchers],
  );

  // Restore dispatcher with optimistic updates
  const restoreDispatcherById = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);

        // Find the dispatcher to restore
        const dispatcherToRestore = archivedDispatchers.find(
          (d) => d.id === id,
        );
        if (!dispatcherToRestore) {
          throw new Error("Dispatcher not found");
        }

        // Store original state for rollback
        const originalActiveDispatchers = [...activeDispatchers];
        const originalArchivedDispatchers = [...archivedDispatchers];

        // Optimistic update: move from archived to active
        setArchivedDispatchers((prev) => prev.filter((d) => d.id !== id));
        setActiveDispatchers((prev) => [dispatcherToRestore, ...prev]);

        try {
          await restoreDispatcher(id);
          // Success - optimistic update was correct, no need to refresh
        } catch (apiError) {
          // Rollback optimistic update on failure
          setActiveDispatchers(originalActiveDispatchers);
          setArchivedDispatchers(originalArchivedDispatchers);
          throw apiError;
        }
      } catch {
        setError("Failed to restore dispatcher");
        throw new Error("Failed to restore dispatcher");
      }
    },
    [activeDispatchers, archivedDispatchers],
  );

  // Update dispatcher with optimistic updates
  const updateDispatcherById = useCallback(
    async (
      id: string,
      dispatcherData: {
        name?: string;
        email?: string;
        contactNumber?: string;
      },
    ) => {
      try {
        setError(null);

        // Store original state for potential rollback
        const originalActiveDispatchers = [...activeDispatchers];
        const originalArchivedDispatchers = [...archivedDispatchers];
        const originalInfoById = { ...infoById };

        // Optimistic update: Update local state immediately
        if (
          dispatcherData.name ||
          dispatcherData.email ||
          dispatcherData.contactNumber
        ) {
          const updateFields = (dispatcher: Dispatcher) => {
            if (dispatcher.id === id) {
              return {
                ...dispatcher,
                ...(dispatcherData.name && { name: dispatcherData.name }),
                ...(dispatcherData.email && { email: dispatcherData.email }),
                ...(dispatcherData.contactNumber && {
                  contactNumber: dispatcherData.contactNumber,
                }),
              };
            }
            return dispatcher;
          };

          setActiveDispatchers((prev) => prev.map(updateFields));
          setArchivedDispatchers((prev) => prev.map(updateFields));

          // Update detailed info as well
          if (infoById[id]) {
            setInfoById((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                ...(dispatcherData.name && { name: dispatcherData.name }),
                ...(dispatcherData.email && { email: dispatcherData.email }),
                ...(dispatcherData.contactNumber && {
                  contactNumber: dispatcherData.contactNumber,
                }),
              },
            }));
          }
        }

        // Create FormData for multipart upload
        const formData = new FormData();

        if (dispatcherData.name) formData.append("name", dispatcherData.name);
        if (dispatcherData.email)
          formData.append("email", dispatcherData.email);
        if (dispatcherData.contactNumber)
          formData.append("contactNumber", dispatcherData.contactNumber);

        try {
          const result = await updateDispatcher(id, formData);

          return result;
        } catch (apiError) {
          // Rollback optimistic updates on API failure
          setActiveDispatchers(originalActiveDispatchers);
          setArchivedDispatchers(originalArchivedDispatchers);
          setInfoById(originalInfoById);
          throw apiError;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update dispatcher";
        setError(errorMessage);
        throw err;
      }
    },
    [activeDispatchers, archivedDispatchers, infoById],
  );

  // Permanently delete dispatcher with optimistic updates
  const deleteDispatcherPermanentlyById = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);

        // Store original state for rollback
        const originalArchivedDispatchers = [...archivedDispatchers];
        const originalInfoById = { ...infoById };

        // Optimistic update: remove from archived list immediately
        setArchivedDispatchers((prev) => prev.filter((d) => d.id !== id));
        setInfoById((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });

        try {
          await deleteDispatcherPermanently(id);
          // Success - optimistic update was correct
        } catch (apiError) {
          // Rollback optimistic update on failure
          setArchivedDispatchers(originalArchivedDispatchers);
          setInfoById(originalInfoById);
          throw apiError;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to permanently delete dispatcher",
        );
        console.error("Error permanently deleting dispatcher:", err);
        throw err;
      }
    },
    [archivedDispatchers, infoById],
  );

  return {
    // Data
    activeDispatchers,
    archivedDispatchers,
    infoById,

    // State
    loading,
    error,

    // Actions
    archiveDispatcherById,
    restoreDispatcherById,
    createNewDispatcher,
    updateDispatcherById,
    deleteDispatcherPermanentlyById,
    fetchActiveDispatchers,
    fetchArchivedDispatchers,
    fetchDispatcherDetails,
    refreshData,

    // Local state setters (for optimistic updates)
    setActiveDispatchers,
    setArchivedDispatchers,
    setInfoById,
  };
}
