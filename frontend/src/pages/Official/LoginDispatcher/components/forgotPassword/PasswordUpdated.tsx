import { Button } from "@/components/ui/button";
import { CheckCircle2Icon } from "lucide-react";

interface PasswordUpdatedProps {
  onBackToLogin: () => void;
}

export function PasswordUpdated({ onBackToLogin }: PasswordUpdatedProps) {
  return (
    <div>
      <main
        className="flex flex-1 flex-col items-center justify-center w-full px-10 sm:px-0"
        style={{ marginTop: "120px", zIndex: 20, position: "relative" }}
      >
        <div
          className="flex flex-col items-center gap-6"
          style={{
            width: "100%",
            maxWidth: window.innerWidth <= 480 ? "95vw" : "460px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* Success Icon */}
          <div className="relative animate-in zoom-in-95 fade-in duration-500">
            <div
              className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-6"
              style={{
                width: window.innerWidth <= 480 ? "80px" : "100px",
                height: window.innerWidth <= 480 ? "80px" : "100px",
                boxShadow: "0 0 40px rgba(59, 130, 246, 0.3)",
              }}
            >
              <CheckCircle2Icon
                size={window.innerWidth <= 480 ? 48 : 60}
                className="text-white"
                strokeWidth={2.5}
              />
            </div>
          </div>

          <h1
            className="text-[43px] font-semibold text-white mb-2 text-center"
            style={window.innerWidth <= 480 ? { fontSize: "1.75rem" } : {}}
          >
            Password Updated
          </h1>

          <p
            className="text-[#BABABA] text-center text-base leading-relaxed mb-4"
            style={window.innerWidth <= 480 ? { fontSize: "0.9rem" } : {}}
          >
            Your password has been changed successfully.
            <br />
            Use your new password to log in.
          </p>

          <Button
            onClick={onBackToLogin}
            className="text-white py-6 rounded-md font-medium text-base flex items-center justify-center gap-2
             bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#2C64C5] hover:to-[#2C64C5]
             transition duration-300 cursor-pointer mt-4"
            style={{
              width: "100%",
              maxWidth: window.innerWidth <= 480 ? "260px" : "490px",
              fontSize: window.innerWidth <= 480 ? "0.95rem" : undefined,
            }}
          >
            Back to Login
          </Button>
        </div>
      </main>
    </div>
  );
}
