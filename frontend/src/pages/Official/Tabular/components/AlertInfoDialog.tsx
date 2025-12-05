import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { LiveReportAlert } from "../types";

interface AlertInfoDialogProps {
  alert: LiveReportAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertInfoDialog({
  alert,
  open,
  onOpenChange,
}: AlertInfoDialogProps) {
  if (!alert) return null;

  const getStatusColor = () => {
    return "!bg-transparent !text-white !border-[#414141]";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#171717] border border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            Alert Information
          </DialogTitle>
          <DialogDescription className="text-[#a1a1a1]">
            Detailed information about the emergency alert
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alert IDs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#a1a1a1]">Alert ID</label>
              <p className="text-white font-medium">{alert.id}</p>
            </div>
            <div>
              <label className="text-sm text-[#a1a1a1]">Emergency ID</label>
              <p className="text-white font-medium">{alert.emergencyId}</p>
            </div>
          </div>

          {/* Community Group */}
          <div>
            <label className="text-sm text-[#a1a1a1]">Community Group</label>
            <p className="text-white font-medium">{alert.communityGroup}</p>
          </div>

          {/* Alert Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#a1a1a1]">Alert Type</label>
              <div className="mt-1">
                <Badge variant="outline" className={`${getStatusColor()} h-7`}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {alert.alertType}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm text-[#a1a1a1]">Status</label>
              <div className="mt-1">
                <Badge variant="outline" className={`${getStatusColor()} h-7`}>
                  {alert.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm text-[#a1a1a1] flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Last Signal Time
            </label>
            <p className="text-white font-medium">{alert.lastSignalTime}</p>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-[#a1a1a1] flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Address
            </label>
            <p className="text-white">{alert.address}</p>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4 border-t border-[#2a2a2a]">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white flex-1"
            >
              Assign Responder
            </Button>

            <Button
              size="sm"
              className="bg-[#4285f4] text-white hover:bg-[#3367d6] flex-1"
            >
              Dispatch Now
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
            >
              <Phone className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-[#404040] text-[#a1a1a1] hover:bg-[#262626] hover:text-white"
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
