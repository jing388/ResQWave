import { apiFetch } from "@/lib/api";

export interface RescueRecord {
    emergencyId: string;
    terminalId: string;
    focalFirstName: string;
    focalLastName: string;
    dateTimeOccurred: string;
    alertType: string;
    houseAddress: string;
    dispatchedName: string | null;
    completionDate?: string;
    noOfPersonnel?: number | null;
    waterLevel?: string | null;
    urgencyOfEvacuation?: string | null;
    hazardPresent?: string | null;
    resourcesUsed?: string | null;
    actionsTaken?: string | null;
}

export interface RescueRecordStats {
    totalRescues: number;
    activityChange: number; // percentage change from previous period
}

/**
 * Fetch completed rescue records for a specific terminal
 */
export async function getRescueRecordsByTerminal(
    terminalId: string
): Promise<RescueRecord[]> {
    try {
        const response = await apiFetch<RescueRecord[]>(
            `/post/table/aggregated?terminalId=${terminalId}`
        );
        return response;
    } catch (error) {
        console.error("[rescueRecordsApi] Error fetching rescue records:", error);
        return [];
    }
}

/**
 * Calculate stats for the past 7 days for a specific terminal
 */
export function calculateRescueStats(
    records: RescueRecord[]
): RescueRecordStats {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const last7Days = records.filter((r) => {
        const date = new Date(r.completionDate || r.dateTimeOccurred);
        return date >= sevenDaysAgo;
    });

    const previous7Days = records.filter((r) => {
        const date = new Date(r.completionDate || r.dateTimeOccurred);
        return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });

    const totalRescues = last7Days.length;
    const previousTotal = previous7Days.length;

    let activityChange = 0;
    if (previousTotal > 0) {
        activityChange = Math.round(
            ((totalRescues - previousTotal) / previousTotal) * 100
        );
    } else if (totalRescues > 0) {
        activityChange = 100; // 100% increase if no previous data
    }

    return {
        totalRescues,
        activityChange,
    };
}
