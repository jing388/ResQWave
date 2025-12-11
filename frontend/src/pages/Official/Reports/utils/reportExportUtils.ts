import { jsPDF } from "jspdf";

export interface OfficialReportData {
  title: string;
  summary?: string;
  // Community & Terminal Information
  neighborhoodId?: string;
  terminalName?: string;
  focalPersonName?: string;
  focalPersonAddress?: string;
  focalPersonContactNumber?: string;

  // Emergency Context
  emergencyId?: string;
  waterLevel?: string;
  urgencyOfEvacuation?: string;
  hazardPresent?: string;
  accessibility?: string;
  resourceNeeds?: string;
  otherInformation?: string;
  timeOfRescue?: string;
  alertType?: string;
  dateTimeOccurred?: string;

  // Dispatcher Information
  dispatcherName?: string;

  // Rescue Completion Details
  rescueFormId?: string;
  postRescueFormId?: string;
  noOfPersonnelDeployed?: string;
  resourcesUsed?: { name: string; quantity: number }[] | string;
  actionTaken?: string;
  rescueCompletionTime?: string;
}

// Export to PDF (copied and adapted from HistoryCommunity exportUtils)
export const exportOfficialReportToPdf = async (data: OfficialReportData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 20;
  const tableWidth = pageWidth - marginLeft - marginRight;
  const col1w = tableWidth * 0.4; // 40% for labels
  const col2w = tableWidth * 0.6; // 60% for values

  let y = marginTop;

  // Title (centered, bold, 16pt, blue)
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(34, 77, 153); // blue
  doc.text(data.title || "Official Rescue Operation Report", pageWidth / 2, y, {
    align: "center",
  });
  y += 10;

  // Intro/description (black, justified, 11)
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const intro =
    data.summary ||
    "This document serves as the official report of the rescue operation conducted for the affected community. It records the key information, emergency context, and actions taken to ensure accountability, transparency, and reference for future disaster response efforts.";
  const introLines = doc.splitTextToSize(intro, tableWidth);
  introLines.forEach((line: string) => {
    doc.text(line, marginLeft, y);
    y += 6;
  });
  y += 12;

  // Section: Community & Terminal Information
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(34, 77, 153);
  doc.text("Community & Terminal Information", marginLeft, y);
  y += 6;

  // Table: Community Info
  const commTable = [
    ["Field", "Value"], // Header row
    ["Neighborhood ID", String(data.neighborhoodId || "N/A")],
    ["Terminal Name", String(data.terminalName || "N/A")],
    ["Focal Person's Name", String(data.focalPersonName || "N/A")],
    ["Focal Person's Address", String(data.focalPersonAddress || "N/A")],
    [
      "Focal Person's Contact Number",
      String(data.focalPersonContactNumber || "N/A"),
    ],
  ];

  // Header row
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setFillColor(34, 77, 153);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginLeft, y, col1w + col2w, 10, "F");
  doc.text(commTable[0][0], marginLeft + 1, y + 7);
  doc.text(commTable[0][1], marginLeft + col1w + 1, y + 7);
  y += 10;

  // Data rows
  for (let i = 1; i < commTable.length; i++) {
    const cellPadX = 2;
    const labelLines = doc.splitTextToSize(
      commTable[i][0],
      col1w - cellPadX * 2,
    );
    const valueLines = doc.splitTextToSize(
      commTable[i][1],
      col2w - cellPadX * 2,
    );
    const valuePadding = valueLines.length > 1 ? 4 : 0;
    const rowHeight = Math.max(
      10,
      labelLines.length * 6,
      valueLines.length * 6 + valuePadding,
    );

    if (y + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }

    doc.rect(marginLeft, y, col1w + col2w, rowHeight);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    let labelY = y + 6;
    labelLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + cellPadX, labelY);
      if (idx < labelLines.length - 1) labelY += 6;
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    let valY = y + 6;
    valueLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + col1w + cellPadX, valY);
      if (idx < valueLines.length - 1) {
        valY += 6;
      } else {
        valY += valuePadding;
      }
    });
    y += rowHeight;
  }
  y += 12;

  // Section: Emergency Context
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(34, 77, 153);
  doc.text("Emergency Context", marginLeft, y);
  y += 6;

  // Table: Emergency Context
  const emTable = [
    ["Field", "Value"], // Header row
    ["Emergency ID", String(data.emergencyId || "N/A")],
    ["Date & Time Occurred", String(data.dateTimeOccurred || "N/A")],
    ["Alert Type", String(data.alertType || "N/A")],
    ["Dispatcher", String(data.dispatcherName || "N/A")],
    ["Current Situation / Water Level", String(data.waterLevel || "N/A")],
    ["Urgency of Evacuation", String(data.urgencyOfEvacuation || "N/A")],
    ["Hazards Present", String(data.hazardPresent || "N/A")],
    ["Accessibility", String(data.accessibility || "N/A")],
    ["Resource Needs", String(data.resourceNeeds || "N/A")],
    ["Other Information", String(data.otherInformation || "N/A")],
    ["Time of Rescue", String(data.timeOfRescue || "N/A")],
  ];

  // Header row
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setFillColor(34, 77, 153);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginLeft, y, col1w + col2w, 10, "F");
  doc.text(emTable[0][0], marginLeft + 1, y + 7);
  doc.text(emTable[0][1], marginLeft + col1w + 1, y + 7);
  y += 10;

  // Data rows
  for (let i = 1; i < emTable.length; i++) {
    const cellPadX = 2;
    const labelLines = doc.splitTextToSize(emTable[i][0], col1w - cellPadX * 2);
    const valueRawLines = String(emTable[i][1] || "").split("\n");
    let valueLines: string[] = [];
    valueRawLines.forEach((valLine) => {
      valueLines = valueLines.concat(
        doc.splitTextToSize(valLine, col2w - cellPadX * 2),
      );
    });
    const valuePadding = valueLines.length > 1 ? 4 : 0;
    const rowHeight = Math.max(
      10,
      labelLines.length * 6,
      valueLines.length * 6 + valuePadding,
    );

    if (y + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }

    doc.rect(marginLeft, y, col1w + col2w, rowHeight);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    let labelY = y + 6;
    labelLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + cellPadX, labelY);
      if (idx < labelLines.length - 1) labelY += 6;
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    let valY = y + 6;
    valueLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + col1w + cellPadX, valY);
      if (idx < valueLines.length - 1) {
        valY += 6;
      } else {
        valY += valuePadding;
      }
    });
    y += rowHeight;
  }

  // Rescue Completion Details
  y += 12;
  if (y + 50 > pageHeight - marginBottom) {
    doc.addPage();
    y = marginTop;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(34, 77, 153);
  doc.text("Rescue Completion Details", marginLeft, y);
  y += 6;

  // Format resources used for display
  const formatResourcesUsed = (resources: { name: string; quantity: number }[] | string | undefined) => {
    if (!resources) return "N/A";
    if (typeof resources === "string") return resources;
    return resources.map(r => `${r.name} (${r.quantity})`).join(", ");
  };

  const rescueTable = [
    ["Field", "Value"], // Header row
    ["Rescue Form ID", String(data.rescueFormId || "N/A")],
    ["Post Rescue Form ID", String(data.postRescueFormId || "N/A")],
    ["Rescue Completion Time", String(data.rescueCompletionTime || "N/A")],
    ["No. of Personnel Deployed", String(data.noOfPersonnelDeployed || "N/A")],
    ["Resources Used", formatResourcesUsed(data.resourcesUsed)],
    ["Actions Taken", String(data.actionTaken || "N/A")],
  ];

  // Header row
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setFillColor(34, 77, 153);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginLeft, y, col1w + col2w, 10, "F");
  doc.text(rescueTable[0][0], marginLeft + 1, y + 7);
  doc.text(rescueTable[0][1], marginLeft + col1w + 1, y + 7);
  y += 10;

  // Data rows
  for (let i = 1; i < rescueTable.length; i++) {
    const cellPadX = 2;
    const labelLines = doc.splitTextToSize(
      rescueTable[i][0],
      col1w - cellPadX * 2,
    );
    const valueRawLines = String(rescueTable[i][1] || "").split("\n");
    let valueLines: string[] = [];
    valueRawLines.forEach((valLine) => {
      valueLines = valueLines.concat(
        doc.splitTextToSize(valLine, col2w - cellPadX * 2),
      );
    });
    const valuePadding = valueLines.length > 1 ? 4 : 0;
    const rowHeight = Math.max(
      10,
      labelLines.length * 6,
      valueLines.length * 6 + valuePadding,
    );

    if (y + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }

    doc.rect(marginLeft, y, col1w + col2w, rowHeight);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    let labelY = y + 6;
    labelLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + cellPadX, labelY);
      if (idx < labelLines.length - 1) labelY += 6;
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    let valY = y + 6;
    valueLines.forEach((line: string, idx: number) => {
      doc.text(line, marginLeft + col1w + cellPadX, valY);
      if (idx < valueLines.length - 1) {
        valY += 6;
      } else {
        valY += valuePadding;
      }
    });
    y += rowHeight;
  }

  // Footer: page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const pageNumText = `Page | ${i}`;
    const textWidth = doc.getTextWidth(pageNumText);
    const xRight = pageWidth - marginRight;
    const yBottom = pageHeight - 10;
    doc.setFillColor(255, 255, 255);
    doc.rect(xRight - textWidth - 2, yBottom - 4, textWidth + 4, 10, "F");
    doc.setTextColor(100, 100, 100);
    doc.text(pageNumText, xRight, yBottom, { align: "right" });
  }

  // Open in new tab instead of download
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
};
