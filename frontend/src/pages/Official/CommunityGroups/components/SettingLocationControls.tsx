import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip-white";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Layers, Minus, Plus, Trash2 } from "lucide-react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { ReactNode, RefObject } from "react";
import { useState } from "react";

// Lightweight aliases to mimic Popover/Trigger/Content API used in the example
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = PopoverPrimitive.Content;

export interface SettingLocationControlsProps {
  mapRef: RefObject<MapboxMap | null>;
  makeTooltip: (text: string) => ReactNode;
  addCustomLayers: (map: MapboxMap) => void;
  onUndo: () => void;
}

export default function SettingLocationControls({
  mapRef,
  makeTooltip,
  addCustomLayers,
  onUndo,
}: SettingLocationControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<"terrain" | "satellite">(
    "terrain",
  );

  return (
    <div className="absolute right-[21px] bottom-[21px] z-[1000] flex flex-col gap-[11px]">
      {/* Layers popover */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Popover onOpenChange={(open) => setLayersOpen(open)}>
                <PopoverTrigger asChild>
                  <div
                    className={
                      "w-[50px] h-[50px] rounded-[7px] flex items-center justify-center cursor-pointer transition-all " +
                      (layersOpen
                        ? "bg-[#111827] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                        : "bg-white text-black shadow-[0_4px_12px_rgba(2,6,23,0.21)] hover:bg-[#EEEEEE]")
                    }
                  >
                    <button
                      aria-label="Layers"
                      className={
                        "bg-transparent border-0 flex items-center justify-center " +
                        (layersOpen ? "text-white" : "text-black")
                      }
                    >
                      <Layers size={21} />
                    </button>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  align="center"
                  className="z-[1100] min-w-[220px] p-2 bg-transparent shadow-none border-0 translate-x-2"
                >
                  {/* Segmented control */}
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-[12px] shadow-[0_8px_20px_rgba(2,6,23,0.12)]">
                    <button
                      onClick={() => {
                        setSelectedLayer("terrain");
                        const m = mapRef.current;
                        if (m) {
                          try {
                            m.setStyle("mapbox://styles/mapbox/outdoors-v12");
                            m.once("styledata", () => {
                              addCustomLayers(m);
                            });
                          } catch {
                            void 0;
                          }
                        }
                      }}
                      className={
                        "px-4 py-2 rounded-lg font-medium cursor-pointer border-0 " +
                        (selectedLayer === "terrain"
                          ? "bg-[#111827] text-white shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
                          : "bg-transparent text-gray-400")
                      }
                    >
                      Terrain
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLayer("satellite");
                        const m = mapRef.current;
                        if (m) {
                          try {
                            m.setStyle(
                              "mapbox://styles/mapbox/satellite-streets-v12",
                            );
                            m.once("styledata", () => {
                              addCustomLayers(m);
                            });
                          } catch {
                            void 0;
                          }
                        }
                      }}
                      className={
                        "px-4 py-2 rounded-lg font-medium cursor-pointer border-0 " +
                        (selectedLayer === "satellite"
                          ? "bg-[#111827] text-white shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
                          : "bg-transparent text-gray-400")
                      }
                    >
                      Satellite
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </TooltipTrigger>
          {!layersOpen && (
            <TooltipContent side="left">{makeTooltip("Layers")}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Trash (undo) button */}
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-[50px] h-[50px] rounded-[7px] bg-white flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(2,6,23,0.21)] transition-colors hover:bg-[#EEEEEE]">
              <button
                aria-label="Undo"
                onClick={onUndo}
                className="bg-transparent border-0 text-black flex items-center justify-center w-full h-full"
              >
                <Trash2 size={21} />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{makeTooltip("Undo")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Zoom in/out */}
      <div className="flex flex-col">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-[50px] rounded-t-[7px] rounded-b-none overflow-hidden bg-white shadow-[0_6px_16px_rgba(2,6,23,0.21)] flex flex-col">
              <button
                aria-label="Zoom out"
                onClick={() => {
                  const m = mapRef.current;
                  if (m) m.zoomOut();
                }}
                className="w-full h-[50px] border-0 bg-transparent text-black flex items-center justify-center border-b border-black/10 transition-colors cursor-pointer hover:bg-[#EEEEEE]"
              >
                <Minus size={21} />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{makeTooltip("Zoom out")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-[50px] rounded-t-none rounded-b-[7px] overflow-hidden bg-white shadow-[0_6px_16px_rgba(2,6,23,0.21)] flex flex-col">
              <button
                aria-label="Zoom in"
                onClick={() => {
                  const m = mapRef.current;
                  if (m) m.zoomIn();
                }}
                className="w-full h-[50px] border-0 bg-transparent text-black flex items-center justify-center transition-colors cursor-pointer hover:bg-[#EEEEEE]"
              >
                <Plus size={21} />
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{makeTooltip("Zoom in")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
