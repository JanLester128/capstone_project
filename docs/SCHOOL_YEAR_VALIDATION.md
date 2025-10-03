# School Year Validation Implementation

## Overview

This implementation ensures data consistency by preventing registrar operations that require an active school year when none exists. It follows Nielsen's HCI principles to provide clear user feedback and guidance.

## Components

### 1. Backend Validation

#### Middleware: `RequireActiveSchoolYear`
- **Location**: `app/Http/Middleware/RequireActiveSchoolYear.php`
- **Purpose**: Validates active school year exists before allowing protected operations
- **Features**:
  - JSON responses for AJAX requests
  - Automatic redirection to school year management
  - Comprehensive logging for debugging

#### Service: `SchoolYearService`
- **Location**: `app/Services/SchoolYearService.php`
- **Purpose**: Centralized school year management with caching
- **Features**:
  - Cached active school year retrieval (5-minute TTL)
  - Operation-specific validation
  - Status information for frontend components
  - School year activation/deactivation methods

### 2. Route Protection

Protected routes require active school year:
- `POST /registrar/sections` - Section creation
- `PUT /registrar/sections/{id}` - Section updates
- `POST /registrar/subjects` - Subject creation
- `PUT /registrar/subjects/{id}` - Subject updates
- All `/registrar/schedules/*` routes - Schedule management

### 3. Frontend Components

#### Warning Component: `SchoolYearWarning`
- **Location**: `resources/js/Components/SchoolYearWarning.jsx`
- **Variants**: Standard, Compact, Inline
- **Features**:
  - HCI-compliant design with clear messaging
  - Action buttons for quick resolution
  - Dismissible with callback support

#### Custom Hook: `useSchoolYearStatus`
- **Location**: `resources/js/hooks/useSchoolYearStatus.js`
- **Features**:
  - Real-time school year status monitoring
  - Operation validation helpers
  - Auto-refresh every 5 minutes
  - Error handling and loading states

### 4. Updated Controllers

All relevant controller methods now include:
- `hasActiveSchoolYear` boolean prop for frontend
- School year status information
- Proper error handling and validation

## Usage Examples

### Backend - Using the Service

```php
use App\Services\SchoolYearService;

// Check if active school year exists
if (!SchoolYearService::hasActive()) {
    return redirect()->back()->with('error', 'No active school year found.');
}

// Require active school year (throws exception if none)
$activeSchoolYear = SchoolYearService::requireActive('section creation');

// Get status for frontend
$status = SchoolYearService::getStatusForFrontend();
```

### Frontend - Using the Warning Component

```jsx
import SchoolYearWarning from '../../Components/SchoolYearWarning';

// In your component
<SchoolYearWarning 
    show={!hasActiveSchoolYear}
    title="No Active School Year Found"
    message="You need to create and activate a school year before creating sections."
    actionText="Create School Year"
    actionLink="/registrar/school-years"
/>
```

### Frontend - Using the Hook

```jsx
import { useOperationValidation } from '../hooks/useSchoolYearStatus';

const { isAllowed, message, hasActiveSchoolYear } = useOperationValidation('section_creation');

// Disable button if not allowed
<button 
    disabled={!isAllowed}
    className={isAllowed ? 'btn-primary' : 'btn-disabled'}
    title={message}
>
    Create Section
</button>
```

## API Endpoints

### GET `/registrar/api/school-year-status`
Returns current school year status:

```json
{
    "hasActiveSchoolYear": true,
    "activeSchoolYear": {
        "id": 1,
        "year_start": 2024,
        "year_end": 2025,
        "is_active": true
    },
    "schoolYearDisplay": "2024-2025",
    "currentSemester": 1,
    "isEnrollmentOpen": true
}
```

## Operation Dependencies

| Operation | Requires Active School Year | Notes |
|-----------|----------------------------|-------|
| Section Creation | ✅ Yes | Sections must be linked to school year |
| Section Updates | ✅ Yes | Maintains data consistency |
| Subject Creation | ✅ Yes | Subjects are year-specific |
| Subject Updates | ✅ Yes | Maintains data consistency |
| Schedule Creation | ✅ Yes | Schedules are year-specific |
| Schedule Updates | ✅ Yes | Maintains data consistency |
| Faculty Creation | ❌ No | Faculty accounts are year-independent |
| Faculty Updates | ❌ No | Faculty accounts are year-independent |

## Error Handling

### Backend Errors
- **422 Unprocessable Entity**: No active school year for AJAX requests
- **Redirect**: Automatic redirect to school year management for web requests
- **Logging**: All attempts logged with user context

### Frontend Errors
- **Visual Feedback**: Warning components with clear messaging
- **Disabled States**: Buttons/forms disabled when operations not allowed
- **Tooltips**: Explanatory text for disabled elements

## HCI Principles Applied

1. **Visibility of System Status**: Clear warnings and status indicators
2. **Error Prevention**: Proactive validation before operations
3. **Help and Documentation**: Clear guidance on resolution steps
4. **User Control**: Easy access to school year management
5. **Consistency**: Uniform validation across all operations

## Testing

### Manual Testing Steps

1. **No Active School Year**:
   - Deactivate all school years
   - Try to create section/subject/schedule
   - Verify warning appears and operations are blocked

2. **With Active School Year**:
   - Activate a school year
   - Verify warnings disappear
   - Verify operations work normally

3. **AJAX Requests**:
   - Test API endpoints return proper JSON responses
   - Verify error handling for missing school year

### Automated Testing

```php
// Test middleware
public function test_requires_active_school_year()
{
    // Deactivate all school years
    SchoolYear::query()->update(['is_active' => false]);
    
    // Attempt protected operation
    $response = $this->post('/registrar/sections', $sectionData);
    
    // Should redirect to school years page
    $response->assertRedirect('/registrar/school-years');
}
```

## Performance Considerations

- **Caching**: Active school year cached for 5 minutes
- **Minimal Queries**: Service reduces database queries
- **Efficient Checks**: Lightweight validation methods

## Future Enhancements

1. **Real-time Updates**: WebSocket notifications for school year changes
2. **Bulk Operations**: Batch validation for multiple operations
3. **Advanced Permissions**: Role-based school year management
4. **Audit Trail**: Detailed logging of school year changes
