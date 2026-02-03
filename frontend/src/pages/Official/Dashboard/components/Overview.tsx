import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useSocket } from "@/contexts/SocketContext";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchCompletedOperationsStats } from "../api/adminDashboard";
import {
    CompletedOperationsBarChart,
    CompletedOperationsLineChart,
    CompletedOperationsPieChart,
    DateRangePicker,
    StatisticsCards,
} from "./index";

type ChartType = "bar" | "line" | "pie";

export function Overview() {
  const [activeChart, setActiveChart] = useState<ChartType>("bar");
  const [userInitiatedCount, setUserInitiatedCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const loadLegendData = async () => {
      try {
        // Determine granularity based on date range
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const granularity = daysDiff <= 31 ? "daily" : "monthly";
        
        console.log('[Overview] Fetching legend data:', {
          granularity,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        });
        
        const response = await fetchCompletedOperationsStats(
          granularity,
          dateRange.startDate,
          dateRange.endDate
        );
        
        console.log('[Overview] Received data:', response);
        
        // Calculate totals from all time periods in response
        let totalUserInitiated = 0;
        let totalCritical = 0;
        
        Object.values(response.stats).forEach((values) => {
          totalUserInitiated += values.userInitiated;
          totalCritical += values.critical;
        });
        
        setUserInitiatedCount(totalUserInitiated);
        setCriticalCount(totalCritical);
      } catch (error) {
        console.error("Error fetching legend data:", error);
      }
    };

    loadLegendData();
  }, [dateRange, refreshTrigger]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostRescueCreated = () => {
      console.log('[Overview] Post-rescue form created, refreshing legend...');
      // Trigger a reload by incrementing the refresh trigger
      setRefreshTrigger(prev => prev + 1);
    };

    socket.on('postRescue:created', handlePostRescueCreated);

    return () => {
      socket.off('postRescue:created', handlePostRescueCreated);
    };
  }, [socket, isConnected]);

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
    // Reload data when date range changes
    // You can pass these dates to your API call in the future
    console.log("Date range changed:", startDate, endDate);
  };

  const handleDownloadChart = async () => {
    if (!chartRef.current) return;

    try {
      // Capture the chart area using html-to-image
      const dataUrl = await htmlToImage.toPng(chartRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#211f1f",
      });

      // Create an image to get dimensions
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Calculate PDF dimensions (A4 size in landscape or portrait based on aspect ratio)
      const aspectRatio = img.width / img.height;
      let pdfWidth, pdfHeight;
      
      if (aspectRatio > 1.4) {
        // Landscape
        pdfWidth = 297; // A4 landscape width in mm
        pdfHeight = 210; // A4 landscape height in mm
      } else {
        // Portrait
        pdfWidth = 210; // A4 portrait width in mm
        pdfHeight = 297; // A4 portrait height in mm
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: aspectRatio > 1.4 ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add metadata
      pdf.setProperties({
        title: `Completed Operations ${activeChart.charAt(0).toUpperCase() + activeChart.slice(1)} Chart`,
        subject: "ResQWave Dashboard Export",
        author: "ResQWave System",
        keywords: "completed operations, rescue, dashboard",
        creator: "ResQWave Dashboard",
      });

      // Calculate image dimensions to fit in PDF while maintaining aspect ratio
      const margin = 10; // mm
      const availableWidth = pdfWidth - (2 * margin);
      const availableHeight = pdfHeight - (2 * margin);
      
      let imgWidth, imgHeight;
      
      if (img.width / img.height > availableWidth / availableHeight) {
        imgWidth = availableWidth;
        imgHeight = (img.height * availableWidth) / img.width;
      } else {
        imgHeight = availableHeight;
        imgWidth = (img.width * availableHeight) / img.height;
      }

      // Center the image
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      // Add image to PDF
      pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);

      // Add footer with date range and generation date
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const footerText = `Generated: ${new Date().toLocaleDateString()} | Date Range: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
      const textWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pdfWidth - textWidth) / 2, pdfHeight - 5);

      // Generate PDF blob and open in new tab
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      // Optional: Also trigger download
      // pdf.save(`completed-operations-${activeChart}-chart-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="p-5 py-4 flex flex-col bg-[#171717] gap-4 h-[calc(100vh-73px)] max-h-[calc(100vh-73px)] overflow-hidden">
      {/* Statistics Cards Section */}
      <div className="shrink-0">
        <StatisticsCards />
      </div>

      {/* Chart Section - 90% of viewport height */}
      <div className="flex-1 min-h-0">
        <Card className="border-border p-0 h-full flex flex-col rounded-[5px]" style={{ backgroundColor: "#211f1f" }}>
          {/* Top Row - Chart Controls */}
          <div className="flex items-center justify-between p-3 border-b mb-0">
            {/* Left side - Chart Type Tabs */}
            <div className="flex items-center gap-0.5 rounded-[5px] bg-[#2a2a2a] p-0.5">
              <button
                onClick={() => setActiveChart("bar")}
                className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  activeChart === "bar"
                    ? "bg-[#404040] text-white"
                    : "text-white/60 hover:text-white hover:bg-[#333333]"
                }`}
              >
                Bar Chart
              </button>
              <button
                onClick={() => setActiveChart("line")}
                className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  activeChart === "line"
                    ? "bg-[#404040] text-white"
                    : "text-white/60 hover:text-white hover:bg-[#333333]"
                }`}
              >
                Line Chart
              </button>
              <button
                onClick={() => setActiveChart("pie")}
                className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  activeChart === "pie"
                    ? "bg-[#404040] text-white"
                    : "text-white/60 hover:text-white hover:bg-[#333333]"
                }`}
              >
                Pie Chart
              </button>
            </div>

            {/* Right side - Download and Date */}
            <div className="flex items-center gap-2">
              {/* Download Button - Icon Only */}
              <button 
                onClick={handleDownloadChart}
                className="flex items-center justify-center p-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-[5px] transition-colors"
                title="Download chart"
                aria-label="Download chart"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Date Range Selector */}
              <DateRangePicker onDateChange={handleDateChange} />
            </div>
          </div>

          {/* Title and Legend Row */}
          <div ref={chartRef} className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 pt-0 border-b">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-foreground text-2xl">
                Completed Operations
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                A breakdown of user-initiated and critical alerts from completed rescue operations
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 bg-[#FFA500] mt-1"></div>
                <div className="flex flex-col items-center">
                  <span className="text-white text-sm">User-initiated</span>
                  <span className="text-white text-3xl font-bold">{userInitiatedCount}</span>
                </div>
              </div>
              {/* Vertical Divider */}
              <div className="h-12 w-px bg-[#404040]"></div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 bg-[#DC2626] mt-1"></div>
                <div className="flex flex-col items-center">
                  <span className="text-white text-sm">Critical</span>
                  <span className="text-white text-3xl font-bold">{criticalCount}</span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="flex-1 flex flex-col min-h-0 pl-0 pr-10 pt-0">
          <div className="w-full h-full">
            {activeChart === "bar" && <CompletedOperationsBarChart dateRange={dateRange} />}
            {activeChart === "line" && <CompletedOperationsLineChart dateRange={dateRange} />}
            {activeChart === "pie" && <CompletedOperationsPieChart dateRange={dateRange} />}
          </div>
        </CardContent>
        </div>
        </Card>
      </div>
    </div>
  );
}
