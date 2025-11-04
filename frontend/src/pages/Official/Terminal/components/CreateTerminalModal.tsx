import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCallback, useEffect, useState } from "react"
import { getNextTerminalId } from "../api/terminalApi"
import type { TerminalDrawerProps, TerminalFormData } from "../types"

interface FormData {
  name: string
}

interface FormErrors {
  name?: string
}

export function CreateTerminalSheet({
  open,
  onOpenChange,
  onSave,
  editData,
  loading = false
}: TerminalDrawerProps) {
  const isEditing = !!editData

  const [formData, setFormData] = useState<FormData>({
    name: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [displayId, setDisplayId] = useState<string>("")
  const [isLoadingId, setIsLoadingId] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // Fetch next terminal ID from backend
  const fetchNextTerminalId = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingId(true)
      const response = await getNextTerminalId()
      setDisplayId(response.nextId)
    } catch (error) {
      console.error('Error fetching next terminal ID:', error)
      setDisplayId("Error loading ID")
    } finally {
      setIsLoadingId(false)
    }
  }, [])

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return "Terminal name is required"
    if (name.trim().length < 2) return "Terminal name must be at least 2 characters long"
    if (name.length > 50) return "Terminal name cannot exceed 50 characters"
    return undefined
  }

  // Check if form is valid
  const isFormValid = (): boolean => {
    const hasValidName = !validateName(formData.name)
    return hasValidName
  }

  // Reset form when opening/closing or when edit data changes
  useEffect(() => {
    if (open && isEditing && editData) {
      setFormData({
        name: editData.name,
      })
      setErrors({})
      setDisplayId(editData.id)
    } else if (open && !isEditing) {
      // Reset for new terminal and fetch the next ID from backend
      setFormData({
        name: "",
      })
      setErrors({})
      setDisplayId("Loading...")
      fetchNextTerminalId()
    }
  }, [open, isEditing, editData, fetchNextTerminalId])

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    // Prevent input beyond 50 characters for name field
    if (field === 'name' && value.length > 50) {
      return // Don't update state if exceeding limit
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }

    // Real-time validation
    if (field === 'name') {
      const error = validateName(value)
      setErrors(prev => ({ ...prev, name: error }))
    }
  }, [errors])

  const handleSave = useCallback(() => {
    // Prevent double clicks - if already saving, don't proceed
    if (isSaving || loading) {
      return
    }

    // Validate all fields
    const nameError = validateName(formData.name)

    const newErrors: FormErrors = {
      name: nameError,
    }

    setErrors(newErrors)

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(error => error !== undefined)

    if (hasErrors) {
      console.log("Validation errors:", newErrors)
      return
    }

    // Set local saving state
    setIsSaving(true)

    // Prepare the data
    const terminalFormData: TerminalFormData = {
      name: formData.name.trim(),
      status: "Offline", // Default status
      availability: "Available", // Default availability
    }

    // Call the onSave callback with form data only (API will handle the details)
    onSave?.(terminalFormData).then(() => {
      // Close modal after successful save
      onOpenChange(false)

      // Reset form
      setFormData({ name: "" })
      setErrors({})
    }).catch((err) => {
      console.error('Error saving terminal:', err)
      // Error is handled by the parent component
    }).finally(() => {
      // Clear local saving state
      setIsSaving(false)
    })
  }, [formData, onSave, onOpenChange, isSaving, loading])

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Prevent closing during save operation
        if (!newOpen && (isSaving || loading)) {
          return
        }
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="bg-[#171717] border-[#2a2a2a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-medium">
            Terminal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Terminal ID Display */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-medium">Terminal ID</Label>
              <span className={`text-sm ${isLoadingId ? 'text-[#4285f4]' : 'text-[#a1a1a1]'}`}>
                {displayId}
              </span>
            </div>
          </div>

          {/* Terminal Name Field */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-white font-medium">Terminal Name</Label>
              <span className="text-[#a1a1a1] text-xs">
                {formData.name.length}/50
              </span>
            </div>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isSaving || loading}
              className="bg-[#262626] border-[#404040] text-white placeholder:text-[#a1a1a1] focus:border-[#4285f4] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter terminal name"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">{errors.name}</p>
            )}
          </div>

          {/* Create Button */}
          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={!isFormValid() || isSaving || loading}
              className="w-full bg-[#4285f4] text-white hover:bg-[#3367d6] disabled:bg-[#404040] disabled:text-[#a1a1a1] py-3 text-lg flex items-center justify-center gap-2"
            >
              {(isSaving || loading) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {(isSaving || loading) ? (
                isEditing ? "Updating..." : "Creating..."
              ) : (
                isEditing ? "Update Terminal" : "Create Terminal"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}