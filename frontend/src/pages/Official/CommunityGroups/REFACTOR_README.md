# Community Groups Components - Clean Architecture

This directory contains the clean, simplified Community Groups feature with global state management for the ResQWave disaster response system.

## 📁 File Structure

```
components/
├── CreateCommunityGroupSheet.tsx         # Main form component with global store
├── CommunityGroupInfoSheet.tsx           # Community group details display
├── CommunityGroupApprovalSheet.tsx       # Approval workflow component
├── PhotoUploadArea.tsx                   # Photo upload component
├── CloseCreateDialog.tsx                 # Confirmation dialog
├── DataTable.tsx                         # Data table component
├── Column.tsx                            # Table column definitions
├── SettingLocationPage.tsx               # Location setting page
├── SettingLocationControls.tsx           # Location controls
└── SettingLocationAlerts.tsx             # Location alerts

data/
└── predefinedCommunityGroups.ts          # Mock data for testing

hooks/
├── useFormStore.ts                       # Global store hook
└── useLocationPickerResults.ts           # Location picker integration

store/
└── formStore.ts                          # Global form state store

types/
├── index.tsx                             # Core type definitions
└── forms.ts                              # Form-specific types

utils/
├── formHelpers.ts                        # Helper functions for form operations
├── BoundaryLine.tsx                      # Boundary line utilities
├── PinAnimation.tsx                      # Pin animation utilities
└── geocoding.ts                          # Geocoding utilities
```

## 👥 Mock Accounts for Testing

For testing and development purposes, the following mock accounts are available:

### Dispatcher Account (Community Representative)

- **Username**: `COMGROUP-01`
- **Password**: `password123`
- **Role**: Dispatcher
- **Name**: Dispatcher User
- **Permissions**:
  - Submit community group registration requests
  - View own community group status
  - Update community information (pending approval)
  - Upload community photos and documents
  - Access focal person dashboard

### Admin Account (Official/Administrator)

- **Username**: `COMGROUP-02`
- **Password**: `password123`
- **Role**: Admin
- **Name**: Admin User
- **Permissions**:
  - Full access to community groups management
  - Create new community groups
  - Edit existing community groups
  - Approve/reject pending community group requests
  - Archive/restore community groups
  - Assign terminals to community groups
  - View detailed community information
  - Access official dashboard

### Test Data Available

#### Active Community Groups (4)

1. **RSQW-101 - PAMAKAI**
   - Focal Person: Marites Dela Cruz
   - Status: OFFLINE
   - Address: Block 2, Lot 5, Rizal St.
   - Population: 156 individuals, 42 families

2. **RSQW-102 - PENTUNAI HOA**
   - Focal Person: Gwen Uy
   - Status: ONLINE
   - Address: Lot 11, Paraiso Rd.
   - Population: 284 individuals, 78 families

3. **RSQW-103 - BAYBAYIN**
   - Focal Person: Ana Santos
   - Status: ONLINE
   - Address: Corner Gen. Luna & Mabini
   - Population: 198 individuals, 54 families

4. **RSQW-001 - Lerandia Subdivision**
   - Focal Person: Gwyneth Uy
   - Status: ONLINE
   - Address: Block 1, Lot 17, Paraiso Rd, 1400
   - Population: 320 individuals, 89 families

#### Pending Approval Groups (3)

1. **R-003 - Riverside Heights**
   - Focal Person: Juan Dela Cruz
   - Status: OFFLINE (Awaiting Approval)
   - Address: Block 5, Lot 14, Riverside Rd, 1423

2. **R-002 - Sunset Village**
   - Focal Person: Kristine Lopez
   - Status: OFFLINE (Awaiting Approval)
   - Address: Block 3, Lot 8, Maligaya Rd, 1411

3. **R-001 - Green Valley**
   - Focal Person: Roberto Reyes
   - Status: OFFLINE (Awaiting Approval)
   - Address: Block 7, Lot 22, Sto. Niño Rd, 1420

### Testing Workflows

1. **Admin Workflow**: Login with `COMGROUP-02` to test approval processes
2. **Dispatcher Workflow**: Login with `COMGROUP-01` to test registration submissions
3. **Cross-Account Testing**: Test the complete approval cycle from submission to activation

## 🏗️ Architecture

### Global State Store Pattern

- **`formStore.ts`**: Global JavaScript store that persists form data across navigation
- **`useFormStore.ts`**: React hook that connects components to the global store
- **No complex session management**: Data persists in memory during navigation

### Key Benefits

- ✅ **Form data persists** when navigating to location picker
- ✅ **Photos remain uploaded** across navigation
- ✅ **Simple state management** with global store
- ✅ **No serialization issues** with File objects
- ✅ **Clean separation of concerns**

## 🔄 Data Flow

1. User fills form → Data stored in global store
2. User navigates to location picker → Component unmounts but store persists
3. User returns → Component remounts and connects to same store
4. All data including photos are still available

## 🚀 Usage

The main component is now `CreateCommunityGroupSheet` which uses the global store pattern for reliable form persistence across navigation.

## 🏗️ Core Components

### 1. CreateCommunityGroupSheet.tsx

**Purpose**: Main form component for creating/editing community groups
**Key Features**:

- Global form state management
- Photo upload with preview
- Location picker integration
- Form validation
- Edit mode support

**Props**:

```typescript
interface CommunityGroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (infoData: CommunityGroupDetails) => void;
  editData?: CommunityGroupDetails;
  isEditing?: boolean;
}
```

### 2. CommunityGroupInfoSheet.tsx

**Purpose**: Display detailed community group information
**Key Features**:

- Comprehensive community data display
- Photo viewer with zoom functionality
- Focal person information
- Community statistics

### 3. CommunityGroupApprovalSheet.tsx

**Purpose**: Handle approval workflow for pending community groups
**Key Features**:

- Review pending applications
- Approve/reject functionality
- Terminal assignment integration
- Complete application details

### 4. PhotoUploadArea.tsx

**Purpose**: Handle photo uploads for focal persons
**Key Features**:

- Drag & drop file upload
- Image preview
- File validation (type, size)
- Replace/delete functionality

**Props**:

```typescript
interface PhotoUploadAreaProps {
  inputId: string;
  photo: File | null;
  onDelete: () => void;
  onFileSelect: (file: File) => void;
  photoUrlKey: "focalPersonPhoto" | "altFocalPersonPhoto";
  photoUrls: PhotoUrls;
}
```

## 🎯 Key Improvements

### 1. **Fixed Auto-Opening Issue**

- **Problem**: Create neighborhood sheet was automatically opening on page load
- **Solution**:
  - Properly clear sessionStorage flags after use
  - Remove window focus event listeners that caused unwanted reopening
  - Clear flags when drawer is intentionally closed

### 2. **Enhanced Form Validation**

- Email validation for focal person contacts
- Phone number validation (11-digit Philippine format)
- Required field validation
- Real-time error display

### 3. **Improved State Management**

- Global form store prevents data loss during navigation
- Proper cleanup of sessionStorage flags
- Better edit mode handling
- Form persistence for location picker workflow

### 4. **Better Data Structure**

- Comprehensive community group details
- Proper TypeScript typing
- Structured focal person information
- Geographic coordinate support

## 🔧 Location Setting Integration

The system includes a sophisticated location picker:

- **SettingLocationPage.tsx**: Full-screen map interface
- **SettingLocationControls.tsx**: Map controls and tools
- **SettingLocationAlerts.tsx**: User guidance and alerts

Location workflow:

1. User clicks "Set Location" in form
2. Navigates to map page
3. Selects coordinates
4. Returns to form with location data preserved

## 🐛 Recent Bug Fixes

1. **✅ Auto-opening drawer issue**: Fixed sessionStorage flag management
2. **✅ Form validation**: Added comprehensive field validation
3. **✅ Data persistence**: Improved form state management
4. **✅ Photo handling**: Better file upload and preview
5. **✅ Edit mode**: Proper form pre-population

## 🧪 Testing Guidelines

### Authentication Testing

1. Test login with both mock accounts (`COMGROUP-01`, `COMGROUP-02`)
2. Verify role-based permissions
3. Test session persistence

### Community Groups Testing

1. **Creation Flow**: Test complete form filling and submission
2. **Location Setting**: Test navigation to/from location picker
3. **Photo Upload**: Test image upload, preview, and replacement
4. **Edit Mode**: Test editing existing community groups
5. **Approval Workflow**: Test admin approval of pending groups

### Data Validation Testing

1. Test all form field validations
2. Test email format validation
3. Test phone number format validation
4. Test required field enforcement

## 📝 Console Logging

All components include comprehensive logging with emoji indicators:

- 🏗️ Component renders
- 📸 Photo operations
- 💾 Data persistence
- 🔄 State changes
- ✅ Success operations
- ❌ Error conditions
- 🔍 Form data updates
- 📍 Location operations

## Key Improvements

### 1. **Code Organization**

- **Before**: Single 1198-line component with everything mixed together
- **After**: 5 focused components + 1 custom hook, each under 200 lines

### 2. **State Management**

- **Before**: Multiple competing useEffects causing infinite loops
- **After**: Single initialization effect with proper dependency management

### 3. **Data Persistence**

- **Before**: Complex session management with race conditions
- **After**: Dedicated hook with proper serialization/deserialization

### 4. **Image Handling**

- **Before**: Base64 strings causing display issues
- **After**: Proper blob URLs with memory cleanup

### 5. **Type Safety**

- **Before**: Loose typing with potential runtime errors
- **After**: Strong TypeScript interfaces throughout

## � Recent Bug Fixes

1. **✅ Maximum update depth exceeded**: Fixed competing useEffect loops
2. **✅ Data loss on navigation**: Proper session persistence
3. **✅ Images not displaying**: Correct blob URL handling
4. **✅ Edit mode issues**: Proper initialization and state management

## 🚀 Performance Improvements

- **Memory Management**: Proper blob URL cleanup prevents memory leaks
- **Debounced Saves**: Auto-save with 500ms debounce reduces storage calls
- **Efficient Re-renders**: Better dependency arrays prevent unnecessary updates
- **Component Splitting**: Smaller components enable better tree shaking

## 📝 Console Logging

All components include comprehensive logging with emoji indicators:

- 🏗️ Component renders
- 📸 Photo operations
- 💾 Data persistence
- 🔄 State changes
- ✅ Success operations
- ❌ Error conditions

## 🧪 Testing Considerations

1. **Form Persistence**: Test navigation away and back to form
2. **Photo Handling**: Test upload, replace, delete operations
3. **Edit Mode**: Test pre-filling and persistence
4. **Validation**: Test file type/size validation
5. **Session Management**: Test session restoration and cleanup
