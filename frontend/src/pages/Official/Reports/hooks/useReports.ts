import { useSocket } from "@/contexts/SocketContext";
import {
    archivePostRescueForm as apiArchivePostRescueForm,
    deletePostRescueForm as apiDeletePostRescueForm,
    fetchArchivedReports as apiFetchArchivedReports,
    fetchCompletedReports as apiFetchCompletedReports,
    fetchPendingReports as apiFetchPendingReports,
    restorePostRescueForm as apiRestorePostRescueForm,
    clearReportsCache,
    type ArchivedReport,
    type CompletedReport,
    type PendingReport,
} from "@/pages/Official/Reports/api/api";
import { extractAddress } from "@/pages/Official/Visualization/api/mapAlerts";
import { useCallback, useEffect, useState } from "react";

// Types for transformed reports
export interface TransformedPendingReport {
  emergencyId: string;
  communityName: string;
  alertType: string;
  dispatcher: string;
  dateTimeOccurred: string;
  address: string;
  terminalName?: string;
  coordinates?: string;
  neighborhoodId?: string;
  focalPersonName?: string;
}

export interface TransformedCompletedReport extends TransformedPendingReport {
  accomplishedOn: string;
}

export type TransformedArchivedReport = TransformedCompletedReport;

// Helper function to format date and time in shorter version
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Format time (e.g., "02:30 PM")
  const timeString = date.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // Format date in shorter version (e.g., "12/08/2025")
  const dateFormatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  return `${dateFormatted} | ${timeString}`;
};

// Transform backend data to frontend format
const transformPendingReport = (
  report: PendingReport,
): TransformedPendingReport => {
  return {
    emergencyId: report.alertId,
    communityName: report.terminalName,
    alertType: report.alertType,
    dispatcher: report.dispatcherName,
    dateTimeOccurred: formatDateTime(report.createdAt),
    address: extractAddress(report.address),
    terminalName: report.terminalName,
    coordinates: report.coordinates,
    neighborhoodId: report.neighborhoodId,
    focalPersonName: report.focalPersonName,
  };
};

const transformCompletedReport = (
  report: CompletedReport,
): TransformedCompletedReport => {
  return {
    emergencyId: report.alertId,
    communityName: report.terminalName,
    alertType: report.alertType,
    dispatcher: report.dispatcherName,
    dateTimeOccurred: formatDateTime(report.createdAt),
    accomplishedOn: formatDateTime(report.completedAt),
    address: extractAddress(report.address),
  };
};

const transformArchivedReport = (
  report: ArchivedReport,
): TransformedArchivedReport => {
  return {
    emergencyId: report.emergencyId,
    communityName: report.terminalName,
    alertType: report.alertType,
    dispatcher: report.dispatchedName,
    dateTimeOccurred: formatDateTime(report.dateTimeOccurred),
    accomplishedOn: formatDateTime(report.completionDate),
    address: extractAddress(report.houseAddress),
  };
};

export function useReports() {
  const [pendingReports, setPendingReports] = useState<
    TransformedPendingReport[]
  >([]);
  const [completedReports, setCompletedReports] = useState<
    TransformedCompletedReport[]
  >([]);
  const [archivedReports, setArchivedReports] = useState<
    TransformedArchivedReport[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending reports only
  const fetchPendingReports = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const pendingData = await apiFetchPendingReports(forceRefresh);
      setPendingReports(pendingData.map(transformPendingReport));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pending reports",
      );
    }
  }, []);

  // Fetch completed reports only
  const fetchCompletedReports = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const completedData = await apiFetchCompletedReports(forceRefresh);
      setCompletedReports(completedData.map(transformCompletedReport));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch completed reports",
      );
    }
  }, []);

  // Fetch archived reports only
  const fetchArchivedReports = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const archivedData = await apiFetchArchivedReports(forceRefresh);
      setArchivedReports(archivedData.map(transformArchivedReport));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch archived reports",
      );
    }
  }, []);

  // Initial data fetch - loads pending, completed, and archived
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchPendingReports(),
        fetchCompletedReports(),
        fetchArchivedReports(),
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [fetchPendingReports, fetchCompletedReports, fetchArchivedReports]);

  // Create a new post rescue form (moves report from pending to completed)
  const createPostRescueForm = useCallback(
    async (
      alertId: string,
      formData: {
        noOfPersonnelDeployed: number;
        resourcesUsed: { name: string; quantity: number }[];
        actionTaken: string;
      },
    ) => {
      try {
        setError(null);

        // Find the pending report that will be moved
        const pendingReport = pendingReports.find(
          (report) => report.emergencyId === alertId,
        );

        // Optimistically update UI immediately
        if (pendingReport) {
          // Remove from pending list immediately
          setPendingReports((current) =>
            current.filter((report) => report.emergencyId !== alertId),
          );
          // Don't add to completed list yet - let the refresh handle correct positioning based on alert date
        }

        // Call the API to create the post rescue form
        const { createPostRescueForm: apiCreatePostRescueForm } =
          await import("@/pages/Official/Reports/api/api");
        const result = await apiCreatePostRescueForm(alertId, formData);

        // Background refresh to get the exact data from server (without loading state)
        setTimeout(async () => {
          try {
            await Promise.all([
              fetchPendingReports(true), // Force refresh pending
              fetchCompletedReports(true), // Force refresh completed
            ]);
          } catch (err) {
            console.error("Background refresh failed:", err);
          }
        }, 50); // Small delay to ensure backend processing is complete

        return result;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create post rescue form",
        );
        // Revert optimistic updates on error
        await Promise.all([
          fetchPendingReports(true),
          fetchCompletedReports(true),
        ]);
        throw err;
      }
    },
    [pendingReports, fetchPendingReports, fetchCompletedReports],
  );

  // Archive a report
  const archiveReport = useCallback(
    async (alertId: string) => {
      try {
        setError(null);

        // Call the API to archive the report
        await apiArchivePostRescueForm(alertId);

        // Refresh both completed and archived reports
        await Promise.all([
          fetchCompletedReports(true),
          fetchArchivedReports(true),
        ]);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to archive report",
        );
        throw err;
      }
    },
    [fetchCompletedReports, fetchArchivedReports],
  );

  // Restore a report
  const restoreReport = useCallback(
    async (alertId: string) => {
      try {
        setError(null);

        // Call the API to restore the report
        await apiRestorePostRescueForm(alertId);

        // Refresh both completed and archived reports
        await Promise.all([
          fetchCompletedReports(true),
          fetchArchivedReports(true),
        ]);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to restore report",
        );
        throw err;
      }
    },
    [fetchCompletedReports, fetchArchivedReports],
  );

  // Delete a report permanently
  const deleteReport = useCallback(
    async (alertId: string) => {
      try {
        setError(null);

        // Call the API to delete the report
        await apiDeletePostRescueForm(alertId);

        // Refresh archived reports
        await fetchArchivedReports(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to delete report",
        );
        throw err;
      }
    },
    [fetchArchivedReports],
  );

  // Refresh all data
  const refreshAllReports = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPendingReports(true), // Force refresh to bypass cache
        fetchCompletedReports(true), // Force refresh to bypass cache
        fetchArchivedReports(true), // Force refresh to bypass cache
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchPendingReports, fetchCompletedReports, fetchArchivedReports]);

  // Clear cache and refresh (for manual cache clearing)
  const clearCacheAndRefresh = useCallback(async () => {
    try {
      await clearReportsCache();
      await refreshAllReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear cache");
    }
  }, [refreshAllReports]);

  // Initial data fetch
  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Socket listener for real-time updates when post-rescue forms are created
  const { socket, isConnected } = useSocket();
  
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostRescueCreated = () => {
      console.log('[Reports] Post-rescue form created, refreshing reports...');
      // Refresh both pending and completed to reflect the changes
      fetchPendingReports(true).catch(err => 
        console.error('[Reports] Failed to refresh pending reports:', err)
      );
      fetchCompletedReports(true).catch(err => 
        console.error('[Reports] Failed to refresh completed reports:', err)
      );
    };

    socket.on('postRescue:created', handlePostRescueCreated);
    console.log('[Reports] Listening for postRescue:created events');

    return () => {
      socket.off('postRescue:created', handlePostRescueCreated);
      console.log('[Reports] Stopped listening for postRescue:created events');
    };
  }, [socket, isConnected, fetchPendingReports, fetchCompletedReports]);

  return {
    // Data
    pendingReports,
    completedReports,
    archivedReports,

    // State
    loading,
    error,

    // Actions
    createPostRescueForm,
    archiveReport,
    restoreReport,
    deleteReport,
    refreshAllReports,
    clearCacheAndRefresh,
  };
}
