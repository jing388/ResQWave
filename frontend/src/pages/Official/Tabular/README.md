# Live Report Tabular View

This feature provides a comprehensive table view for emergency alerts and live reports, following the design from the ResQWave Figma prototype.

## Features

- **Live Report Table**: Displays emergency alerts in a tabular format
- **Tab Filtering**: Filter alerts by status (All, Unassigned, Waitlisted, Dispatched)
- **Search Functionality**: Search through alerts by various fields
- **Alert Type Filtering**: Filter by alert type (Critical, User-Initiated, Online, Offline)
- **Sorting**: Sort columns like Community Group and Last Signal Time
- **Action Menu**: Access actions like More Info, Assign, and Dispatch for each alert
- **Pagination**: Navigate through multiple pages of data
- **Alert Info Dialog**: Detailed view of alert information with action buttons

## Components

### Main Component

- `Tabular` - Main component that renders the live report table

### Sub Components

- `DataTable` - Reusable table component with sorting and pagination
- `Columns` - Column definitions with action menus
- `AlertInfoDialog` - Modal for displaying detailed alert information

### Utilities

- `filters.ts` - Functions for filtering alerts by various criteria

### Types

- Complete TypeScript type definitions for all data structures

## Usage

```tsx
import { Tabular } from "./pages/Official/Tabular";

function App() {
  return <Tabular />;
}
```

## Data Structure

The component expects data in the following format:

```typescript
interface LiveReportAlert {
  id: string; // Alert ID (e.g., "RSQW-002")
  emergencyId: string; // Emergency ID (e.g., "EMG-002")
  communityGroup: string; // Community name
  alertType: "CRITICAL" | "USER-INITIATED" | "ONLINE" | "OFFLINE";
  status: "WAITLISTED" | "UNASSIGNED" | "DISPATCHED";
  lastSignalTime: string; // Formatted time string
  address: string; // Full address
}
```

## Styling

The component uses a dark theme with:

- Dark background (`#0f0f0f`)
- Table with dark styling (`#191818`, `#262626`)
- Blue accent color for actions (`#4285f4`)
- Color-coded badges for different alert types and statuses

## Customization

You can customize:

- Tab counts and filtering logic in `utils/filters.ts`
- Column definitions in `components/Columns.tsx`
- Alert data source in `data/mockData.ts`
- Styling through Tailwind CSS classes

## Integration

This component is designed to work with:

- The existing ResQWave design system
- ShadCN UI components
- Tanstack Table for data management
- Lucide React for icons
