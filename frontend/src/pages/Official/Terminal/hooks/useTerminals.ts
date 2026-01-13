import { useCallback, useEffect, useState } from "react";
import {
    archiveTerminal,
    createTerminal,
    getActiveTerminals,
    getArchivedTerminals,
    getTerminal,
    permanentDeleteTerminal,
    transformTerminalDetailsResponse,
    transformTerminalResponse,
    unarchiveTerminal,
    updateTerminal,
} from "../api/terminalApi";
import type { Terminal, TerminalDetails, TerminalFormData } from "../types";

export function useTerminals() {
  const [activeTerminals, setActiveTerminals] = useState<Terminal[]>([]);
  const [archivedTerminals, setArchivedTerminals] = useState<Terminal[]>([]);
  const [infoById, setInfoById] = useState<Record<string, TerminalDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active terminals
  const fetchActiveTerminals = useCallback(async () => {
    try {
      setError(null);
      const response = await getActiveTerminals();
      const transformedData = response.map(transformTerminalResponse);
      setActiveTerminals(transformedData);

      // Also store detailed info for each terminal
      const detailsMap: Record<string, TerminalDetails> = {};
      response.forEach((terminal) => {
        detailsMap[terminal.id] = transformTerminalDetailsResponse(terminal);
      });
      setInfoById((prev) => ({ ...prev, ...detailsMap }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch active terminals",
      );
      console.error("Error fetching active terminals:", err);
    }
  }, []);

  // Fetch archived terminals
  const fetchArchivedTerminals = useCallback(async () => {
    try {
      setError(null);
      const response = await getArchivedTerminals();
      const transformedData = response.map(transformTerminalResponse);
      setArchivedTerminals(transformedData);

      // Also store detailed info for archived terminals
      const detailsMap: Record<string, TerminalDetails> = {};
      response.forEach((terminal) => {
        detailsMap[terminal.id] = transformTerminalDetailsResponse(terminal);
      });
      setInfoById((prev) => ({ ...prev, ...detailsMap }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch archived terminals",
      );
      console.error("Error fetching archived terminals:", err);
    }
  }, []);

  // Fetch detailed info for a specific terminal
  const fetchTerminalDetails = useCallback(
    async (id: string): Promise<TerminalDetails | null> => {
      try {
        const response = await getTerminal(id);
        const details = transformTerminalDetailsResponse(response);

        // Update the infoById state
        setInfoById((prev) => ({ ...prev, [id]: details }));

        return details;
      } catch (err) {
        console.error(`Error fetching terminal ${id} details:`, err);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to fetch terminal ${id} details`,
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
        await Promise.all([fetchActiveTerminals(), fetchArchivedTerminals()]);
      } catch (err) {
        console.error("Error loading initial terminal data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchActiveTerminals, fetchArchivedTerminals]);

  // Create new terminal
  const createNewTerminal = useCallback(
    async (terminalData: TerminalFormData) => {
      try {
        setError(null);
        const result = await createTerminal({
          name: terminalData.name,
          devEUI: terminalData.devEUI,
        });

        // Refresh the active terminals list after successful creation
        await fetchActiveTerminals();

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create terminal";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchActiveTerminals],
  );

  // Update terminal
  const updateTerminalById = useCallback(
    async (id: string, terminalData: Partial<TerminalFormData>) => {
      try {
        setError(null);
        const result = await updateTerminal(id, {
          ...(terminalData.name && { name: terminalData.name }),
          ...(terminalData.status && { status: terminalData.status }),
        });

        // Refresh data after successful update
        await fetchActiveTerminals();

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update terminal";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchActiveTerminals],
  );

  // Archive terminal
  const archiveTerminalById = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await archiveTerminal(id);

        // Refresh both lists after successful archiving
        await Promise.all([fetchActiveTerminals(), fetchArchivedTerminals()]);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to archive terminal";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchActiveTerminals, fetchArchivedTerminals],
  );

  // Unarchive terminal
  const unarchiveTerminalById = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await unarchiveTerminal(id);

        // Refresh both lists after successful unarchiving
        await Promise.all([fetchActiveTerminals(), fetchArchivedTerminals()]);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to unarchive terminal";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchActiveTerminals, fetchArchivedTerminals],
  );

  // Permanently delete terminal (only archived terminals)
  const permanentDeleteTerminalById = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const result = await permanentDeleteTerminal(id);

        // Refresh archived terminals list after successful permanent deletion
        await fetchArchivedTerminals();

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to permanently delete terminal";
        setError(errorMessage);
        throw err;
      }
    },
    [fetchArchivedTerminals],
  );

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchActiveTerminals(), fetchArchivedTerminals()]);
    } catch (err) {
      console.error("Error refreshing terminal data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveTerminals, fetchArchivedTerminals]);

  // Get terminal info (from cache or fetch if needed)
  const getTerminalInfo = useCallback(
    async (id: string): Promise<TerminalDetails | null> => {
      // Return cached info if available
      if (infoById[id]) {
        return infoById[id];
      }

      // Otherwise fetch it
      return fetchTerminalDetails(id);
    },
    [infoById, fetchTerminalDetails],
  );

  return {
    // Data
    activeTerminals,
    archivedTerminals,
    infoById,

    // State
    loading,
    error,

    // Actions
    archiveTerminalById,
    createNewTerminal,
    fetchActiveTerminals,
    fetchArchivedTerminals,
    fetchTerminalDetails,
    getTerminalInfo,
    permanentDeleteTerminalById,
    refreshData,
    unarchiveTerminalById,
    updateTerminalById,

    // Local state setters (for optimistic updates)
    setActiveTerminals,
    setArchivedTerminals,
    setInfoById,
  };
}
