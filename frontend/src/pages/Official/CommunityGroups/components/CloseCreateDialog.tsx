import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CloseCreateDialogProps } from "../types";

export function CloseCreateDialog({
  open,
  onOpenChange,
  onCancel,
  onDiscard,
  title = "Discard new community group?",
  description = "You have unsaved changes. If you discard, the new community group will not be created.",
  cancelLabel = "Cancel",
  discardLabel = "Discard",
}: CloseCreateDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#171717] border-[#2a2a2a]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            className="bg-transparent border-[#2a2a2a] text-white hover:bg-[#262626]"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscard}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {discardLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
