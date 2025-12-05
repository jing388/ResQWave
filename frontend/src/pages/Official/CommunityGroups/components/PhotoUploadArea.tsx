import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

interface PhotoUploadAreaProps {
  inputId: string;
  photo: File | null;
  onDelete: () => void;
  photoUrlKey: "focalPersonPhoto" | "altFocalPersonPhoto";
  photoUrls: {
    focalPersonPhoto: string | null;
    altFocalPersonPhoto: string | null;
  };
  onFileSelect: (file: File) => void;
}

export const PhotoUploadArea = ({
  inputId,
  photo,
  onDelete,
  photoUrlKey,
  photoUrls,
  onFileSelect,
}: PhotoUploadAreaProps) => {
  // Use the stored photo URL if available, otherwise create from file
  const photoUrl = useMemo(() => {
    console.log(`🖼️ PhotoUploadArea[${photoUrlKey}] - determining URL:`, {
      hasStoredUrl: !!photoUrls[photoUrlKey],
      storedUrlType: photoUrls[photoUrlKey]?.startsWith("blob:")
        ? "blob"
        : photoUrls[photoUrlKey]?.startsWith("data:")
          ? "base64"
          : "none",
      hasFile: !!photo,
      photoUrls: photoUrls[photoUrlKey],
    });

    // First priority: use the stored URL (for restored photos or manually set URLs)
    if (photoUrls[photoUrlKey]) {
      console.log(
        `✅ Using stored URL for ${photoUrlKey}:`,
        photoUrls[photoUrlKey]!.substring(0, 50) + "...",
      );
      return photoUrls[photoUrlKey];
    }

    // Second priority: create from file (for newly uploaded photos)
    if (!photo) {
      console.log(`ℹ️ No photo file or stored URL for ${photoUrlKey}`);
      return null;
    }

    try {
      const newUrl = URL.createObjectURL(photo);
      console.log(`🆕 Created new object URL for ${photoUrlKey}:`, newUrl);
      return newUrl;
    } catch (error) {
      console.error(
        `❌ Failed to create object URL for ${photoUrlKey}:`,
        error,
      );
      return null;
    }
  }, [photo, photoUrlKey, photoUrls]);

  // Clean up the object URL when component unmounts or photo changes
  useEffect(() => {
    return () => {
      if (photoUrl && photoUrl.startsWith("blob:") && !photoUrls[photoUrlKey]) {
        // Only revoke blob URLs we created temporarily, not the stored URLs
        try {
          URL.revokeObjectURL(photoUrl);
          console.log(`🧹 Cleaned up temporary blob URL for ${photoUrlKey}`);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [photoUrl, photoUrlKey, photoUrls]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleUploadClick = useCallback(() => {
    document.getElementById(inputId)?.click();
  }, [inputId]);

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={`Upload ${photoUrlKey === "focalPersonPhoto" ? "focal person" : "alternative focal person"} photo`}
        title={`Upload ${photoUrlKey === "focalPersonPhoto" ? "focal person" : "alternative focal person"} photo`}
        onChange={handleFileChange}
      />

      {/* Clickable area only when there is no photo (avoids nested interactive elements) */}
      {!photo && !photoUrls[photoUrlKey] ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleUploadClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleUploadClick();
            }
          }}
          className="bg-[#262626] border border-dashed border-[#404040] rounded-[8px] p-7 text-center flex flex-col items-center justify-center gap-[5px] hover:bg-[#2a2a2a] cursor-pointer"
        >
          <div className="w-12 h-12 bg-[#1f2937] rounded-[8px] flex items-center justify-center">
            <Upload className="w-6 h-6 text-[#60A5FA]" />
          </div>
          <div>
            <p className="text-white font-medium">Upload photo</p>
            <p className="text-gray-400 text-sm mt-1">
              Drag and drop or click to upload
              <br />
              JPG and PNG, file size no more than 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b0b0b] rounded-[6px] flex justify-center mt-1">
          <div className="relative w-full h-56 rounded-[8px] overflow-hidden bg-[#111]">
            {/* Blurred backdrop */}
            <img
              src={photoUrl || "/placeholder.svg"}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover filter blur-[18px] brightness-50 scale-[1.2]"
            />
            {/* Foreground image */}
            <img
              src={photoUrl || "/placeholder.svg"}
              alt="Uploaded"
              className="relative w-auto h-full max-w-[60%] m-auto block object-contain"
            />
            {/* Actions */}
            <div className="absolute bottom-3 right-3 flex gap-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleUploadClick}
                aria-label="Change photo"
                title="Change photo"
                className="bg-white border-[#2a2a2a] text-black hover:bg-white rounded-none w-8 h-8"
              >
                <RefreshCcw className="w-4 h-4 text-black" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onDelete}
                aria-label="Delete photo"
                title="Delete photo"
                className="bg-white border-[#2a2a2a] text-red-500 hover:bg-white rounded-none w-8 h-8"
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
