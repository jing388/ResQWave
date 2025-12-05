import type { AlertFilter, LiveReportAlert, TabType } from "../types";

export const filterAlertsByTab = (
  alerts: LiveReportAlert[],
  tab: TabType,
): LiveReportAlert[] => {
  switch (tab) {
    case "all":
      return alerts;
    case "unassigned":
      return alerts.filter((alert) => alert.status === "UNASSIGNED");
    case "waitlisted":
      return alerts.filter((alert) => alert.status === "WAITLISTED");
    case "dispatched":
      return alerts.filter((alert) => alert.status === "DISPATCHED");
    default:
      return alerts;
  }
};

export const filterAlertsBySearch = (
  alerts: LiveReportAlert[],
  searchQuery: string,
): LiveReportAlert[] => {
  if (!searchQuery.trim()) return alerts;

  const query = searchQuery.toLowerCase();
  return alerts.filter(
    (alert) =>
      alert.id.toLowerCase().includes(query) ||
      alert.emergencyId.toLowerCase().includes(query) ||
      alert.communityGroup.toLowerCase().includes(query) ||
      alert.address.toLowerCase().includes(query) ||
      alert.alertType.toLowerCase().includes(query) ||
      alert.status.toLowerCase().includes(query),
  );
};

export const filterAlertsByType = (
  alerts: LiveReportAlert[],
  alertType: string,
): LiveReportAlert[] => {
  if (alertType === "All") return alerts;
  return alerts.filter((alert) => alert.alertType === alertType);
};

export const applyAllFilters = (
  alerts: LiveReportAlert[],
  filters: AlertFilter,
): LiveReportAlert[] => {
  let filteredAlerts = filterAlertsByTab(alerts, filters.tab);
  filteredAlerts = filterAlertsBySearch(filteredAlerts, filters.search);
  filteredAlerts = filterAlertsByType(filteredAlerts, filters.alertType);
  return filteredAlerts;
};

export const getTabCounts = (alerts: LiveReportAlert[]) => {
  return {
    all: alerts.length,
    unassigned: alerts.filter((alert) => alert.status === "UNASSIGNED").length,
    waitlisted: alerts.filter((alert) => alert.status === "WAITLISTED").length,
    dispatched: alerts.filter((alert) => alert.status === "DISPATCHED").length,
  };
};
