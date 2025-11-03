export type DashboardAlertsProps = {
    editBoundaryOpen: boolean;
    canSave: boolean;
    /** increment to notify saved event; nullable so initial mount doesn't trigger the saved alert */
    savedTrigger: number | null;
    /** optional custom message to display inside the saved confirmation alert */
    savedMessage?: string | null;
    onViewLogs?: () => void;
    /** whether to show the "View Logs" button inside the saved alert */
    showViewLogs?: boolean;
};

