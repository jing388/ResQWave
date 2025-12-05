import {
    fetchCompletedReports as apiFetchCompletedReports,
    fetchPendingReports as apiFetchPendingReports,
    clearReportsCache,
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
}

export interface TransformedCompletedReport extends TransformedPendingReport {
  accomplishedOn: string;
}

// Transform backend data to frontend format
const transformPendingReport = (
  report: PendingReport,
): TransformedPendingReport => {
  return {
    emergencyId: report.alertId,
    communityName: report.terminalName,
    alertType: report.alertType,
    dispatcher: report.dispatcherName,
    dateTimeOccurred: new Date(report.createdAt).toLocaleString(),
    address: extractAddress(report.address),
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
    dateTimeOccurred: new Date(report.createdAt).toLocaleString(),
    accomplishedOn: new Date(report.completedAt).toLocaleString(),
    address: extractAddress(report.address),
  };
};

export function useReports() {
  const [pendingReports, setPendingReports] = useState<
    TransformedPendingReport[]
  >([]);
  const [completedReports, setCompletedReports] = useState<
    TransformedCompletedReport[]
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

  // Initial data fetch - loads both pending and completed
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([fetchPendingReports(), fetchCompletedReports()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [fetchPendingReports, fetchCompletedReports]);

  // Create a new post rescue form (moves report from pending to completed)
  const createPostRescueForm = useCallback(
    async (
      alertId: string,
      formData: {
        noOfPersonnelDeployed: number;
        resourcesUsed: string;
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

  // Refresh all data
  const refreshAllReports = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPendingReports(true), // Force refresh to bypass cache
        fetchCompletedReports(true), // Force refresh to bypass cache
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchPendingReports, fetchCompletedReports]);

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

  return {
    // Data
    pendingReports,
    completedReports,

    // State
    loading,
    error,

    // Actions
    createPostRescueForm,
    refreshAllReports,
    clearCacheAndRefresh,
  };
}
