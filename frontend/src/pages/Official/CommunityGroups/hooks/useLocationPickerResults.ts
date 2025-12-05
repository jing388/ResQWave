import { useEffect } from "react";
import { formStore } from "../store/formStore";

export function useLocationPickerResults() {
  useEffect(() => {
    console.log("🔄 useLocationPickerResults hook mounted/re-run");

    const consumePickResult = () => {
      try {
        console.log("🔍 Checking for pick result in sessionStorage...");
        const raw = sessionStorage.getItem("cg_pick_result");
        if (!raw) {
          console.log("❌ No pick result found");
          return;
        }

        console.log("📦 Raw pick result:", raw);
        sessionStorage.removeItem("cg_pick_result");
        const parsed = JSON.parse(raw);

        console.log("🗺️ Consuming pick result:", parsed);

        if (parsed?.type === "point") {
          const { lng, lat, address } = parsed.data || {};
          console.log("📍 Location data:", { lng, lat, address });
          if (lng != null && lat != null && address) {
            const formattedCoords = `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
            console.log(
              "✅ Updating form with address:",
              address,
              "coords:",
              formattedCoords,
            );
            formStore.updateFormData({
              focalPersonAddress: address,
              focalPersonCoordinates: formattedCoords,
            });
          } else {
            console.warn("⚠️ Missing required location data:", {
              lng,
              lat,
              address,
            });
          }
        } else {
          console.warn("⚠️ Unexpected data type:", parsed?.type);
        }

        console.log("✅ Pick result consumed successfully");
      } catch (error) {
        console.error("❌ Failed to consume pick result:", error);
      }
    };

    // Check for pick results immediately
    consumePickResult();

    // Also check on window focus (backup mechanism)
    const handleFocus = () => {
      setTimeout(consumePickResult, 100);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}
