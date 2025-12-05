import {
  LiveReportProvider,
  useLiveReport,
} from "@/components/Official/LiveReportContext";
import {
  RescueFormProvider,
  useRescueForm,
} from "@/components/Official/RescueFormContext";
import { useAuth } from "@/contexts/AuthContext";
import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Header } from "./header";
import Sidebar from "./sidebar";

interface officialLayoutProps {
  children: React.ReactNode;
}

function OfficialLayoutContent({ children }: officialLayoutProps) {
  const location = useLocation();
  const { isLiveReportOpen } = useLiveReport();
  const { isRescueFormOpen, isRescuePreviewOpen } = useRescueForm();

  // Get auth state
  let isLoading = false;
  let user = null;
  try {
    const auth = useAuth();
    isLoading = auth.isLoading;
    user = auth.user;
  } catch {
    // Outside provider, check localStorage
    const storedToken = localStorage.getItem("resqwave_token");
    const storedUser = localStorage.getItem("resqwave_user");
    if (storedUser && storedToken) {
      try {
        user = JSON.parse(storedUser);
      } catch {
        user = null;
      }
    }
  }

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in after loading, redirect to login
  if (!user) {
    return <Navigate to="/login-official" replace />;
  }

  // Visualization nav is open if path starts with /visualization or /tabular
  const isVisualizationOpen =
    location.pathname.startsWith("/visualization") ||
    location.pathname.startsWith("/tabular");

  // Calculate margin based on which sidebars are open (only for visualization pages)
  const getMarginRight = () => {
    if (!isVisualizationOpen) return "0";
    if (isRescuePreviewOpen) return "400px"; // Preview is wider
    if (isRescueFormOpen) return "400px"; // Form width
    if (isLiveReportOpen) return "400px"; // Live report width
    return "0";
  };

  return (
    <div className="min-h-screen h-screen bg-background dark overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <Sidebar />
        <div
          className="flex-1 flex flex-col transition-all duration-300 ease-in-out h-full overflow-hidden"
          style={{
            marginRight: getMarginRight(),
          }}
        >
          <Header isVisualizationOpen={isVisualizationOpen} />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function OfficialLayout({ children }: officialLayoutProps) {
  return (
    <LiveReportProvider>
      <RescueFormProvider>
        <OfficialLayoutContent>{children}</OfficialLayoutContent>
      </RescueFormProvider>
    </LiveReportProvider>
  );
}
