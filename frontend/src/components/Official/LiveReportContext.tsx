/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";

interface LiveReportContextType {
  isLiveReportOpen: boolean;
  setIsLiveReportOpen: (open: boolean) => void;
  toggleLiveReport: () => void;
}

const LiveReportContext = createContext<LiveReportContextType | undefined>(
  undefined
);

export function LiveReportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLiveReportOpen, setIsLiveReportOpen] = useState(false);

  const toggleLiveReport = () => {
    setIsLiveReportOpen((prev) => !prev);
  };

  return (
    <LiveReportContext.Provider
      value={{
        isLiveReportOpen,
        setIsLiveReportOpen,
        toggleLiveReport,
      }}
    >
      {children}
    </LiveReportContext.Provider>
  );
}

export function useLiveReport() {
  const context = useContext(LiveReportContext);
  if (context === undefined) {
    throw new Error("useLiveReport must be used within a LiveReportProvider");
  }
  return context;
}
