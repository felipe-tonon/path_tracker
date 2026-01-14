# Browser Testing Guide

## 🌐 Open the Application

**URL**: http://localhost:3001

## ✅ Test Checklist

### 1. Authentication Flow

#### Sign Up (First Time Users)
1. Open http://localhost:3001/sign-up
2. ✅ **Verify**: Clerk sign-up form appears
3. Enter email and password
4. Complete email verification
5. ✅ **Expected**: Redirected to dashboard (/)

#### Sign In (Returning Users)
1. Open http://localhost:3001/sign-in
2. ✅ **Verify**: Clerk sign-in form appears
3. Enter credentials
4. ✅ **Expected**: Redirected to dashboard (/)

#### Protected Routes
1. Try accessing http://localhost:3001/ without being logged in
2. ✅ **Expected**: Redirected to /sign-in
3. Sign in
4. ✅ **Expected**: Redirected back to dashboard

---

### 2. Dashboard Pages

After signing in, test each page:

#### Overview Page (/)
- ✅ Page loads without errors
- ✅ Shows metric cards (Total Requests, LLM Requests, Total Cost, etc.)
- ✅ "Getting Started" card with example cURL command
- ✅ Sidebar navigation visible
- ✅ User button in sidebar (or Sign In button if not authenticated)

#### API Keys Page (/keys)
**Create API Key:**
1. Click "Create API Key" button
2. ✅ **Verify**: Modal dialog opens
3. Enter a name (e.g., "Test Key")
4. Click "Create Key"
5. ✅ **Verify**: Success toast appears
6. ✅ **Verify**: Full API key shown with warning
7. ✅ **Verify**: "Save this key now!" warning displayed
8. Click "Copy Key"
9. ✅ **Verify**: "Copied" toast appears
10. Click "Done"
11. ✅ **Verify**: Dialog closes
12. ✅ **Verify**: New key appears in list (masked)

**Manage Existing Keys:**
1. ✅ **Verify**: Keys list shows all created keys
2. ✅ **Verify**: Each key shows: name, preview, created date, last used, usage count
3. Click "Copy" button on a key
4. ✅ **Verify**: "Copied" toast appears
5. Click "Revoke" button
6. ✅ **Verify**: Confirmation dialog appears
7. Cancel first, then confirm
8. ✅ **Verify**: Key shows "Revoked" badge
9. ✅ **Verify**: Copy and Revoke buttons disabled for revoked keys

**Empty State:**
1. If no keys exist yet
2. ✅ **Verify**: Shows "No API keys yet" message
3. ✅ **Verify**: Shows example usage with Authorization header

#### Request Paths Page (/paths)
- ✅ Page loads without errors
- ✅ Placeholder content displayed
- (Full functionality to be implemented)

#### Logs Page (/logs)
- ✅ Page loads without errors
- ✅ Placeholder content displayed
- (Full functionality to be implemented)

#### Metrics Page (/metrics)
- ✅ Page loads without errors
- ✅ Placeholder content displayed
- (Full functionality to be implemented)

#### Users Page (/users)
- ✅ Page loads without errors
- ✅ Placeholder content displayed
- (Full functionality to be implemented)

#### Settings Page (/settings)
- ✅ Page loads without errors
- ✅ Placeholder content displayed
- (Full functionality to be implemented)

---

### 3. Navigation

#### Sidebar Navigation
1. ✅ **Verify**: Sidebar appears on all dashboard pages
2. ✅ **Verify**: Logo and app name displayed
3. ✅ **Verify**: All menu items present:
   - Overview
   - Request Paths
   - Logs
   - Metrics
   - Users
   - API Keys
   - Settings
4. ✅ **Verify**: Active page highlighted
5. Click each menu item
6. ✅ **Verify**: Navigation works, URL updates
7. ✅ **Verify**: Active state updates correctly

#### User Menu
- **When Signed In:**
  - ✅ **Verify**: Clerk UserButton appears in sidebar footer
  - Click UserButton
  - ✅ **Verify**: Clerk menu opens with account options
  - ✅ **Verify**: Can sign out

- **When Signed Out:**
  - ✅ **Verify**: "Sign In" button appears
  - Click button
  - ✅ **Verify**: Redirected to /sign-in

---

### 4. Theme Switching

1. Look for theme toggle (if implemented)
2. ✅ **Verify**: Dark mode is default
3. Toggle theme
4. ✅ **Verify**: Theme persists across page navigation

---

### 5. API Endpoints (from Browser Console)

Open browser DevTools Console and test:

```javascript
// Test health check
fetch('/api/health').then(r => r.json()).then(console.log)
// Expected: { status: "healthy", ... }

// Test creating an API key (requires authentication)
fetch('/api/keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Browser Test Key' })
}).then(r => r.json()).then(console.log)
// Expected: { key: "pwtrk_...", key_id: "...", ... }

// Test listing keys
fetch('/api/keys').then(r => r.json()).then(console.log)
// Expected: { keys: [...] }
```

---

### 6. Error Handling

#### Network Errors
1. Stop the PostgreSQL container
2. Refresh a page
3. ✅ **Verify**: Graceful error message (not crash)
4. Restart PostgreSQL
5. ✅ **Verify**: App recovers

#### Invalid Input
1. Try creating API key with empty name
2. ✅ **Verify**: Error toast appears
3. ✅ **Verify**: Dialog doesn't close

#### Authorization Errors
1. Try accessing API endpoints without authentication
2. ✅ **Verify**: 401 Unauthorized response
3. ✅ **Verify**: Appropriate error message

---

### 7. Responsive Design

Test on different screen sizes:
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

**Verify:**
- Sidebar adapts (or shows hamburger menu)
- Cards stack properly
- Buttons remain accessible
- No horizontal scrolling

---

### 8. Performance

1. Open DevTools Network tab
2. Load dashboard
3. ✅ **Verify**: Page loads in < 2 seconds
4. ✅ **Verify**: No unnecessary API calls
5. ✅ **Verify**: No console errors

---

## 🐛 Known Issues & Limitations

### Current State:
- ✅ API Keys page: **Fully functional**
- ⚠️ Other pages: **Placeholder UI only** (paths, logs, metrics, users, settings)
- ✅ Authentication: **Fully functional** with Clerk
- ✅ API endpoints: **All working** (tracking, health, query, keys)
- ✅ Theme: **Dark mode working**
- ✅ Navigation: **Fully functional**

### Next Steps for Full Implementation:
1. Implement Paths visualization page with flowchart
2. Implement Logs page with filters and table
3. Implement Metrics page with charts
4. Implement Users page with user management
5. Implement Settings page with tenant configuration

---

## ✅ Quick Verification Steps

**For the impatient:**

1. Open http://localhost:3001/sign-in in your browser
2. ✅ You should see Clerk's sign-in form
3. Sign in or create an account
4. ✅ You should be redirected to the dashboard
5. Navigate to "API Keys" in the sidebar
6. Click "Create API Key"
7. ✅ Modal should open
8. Enter a name and create
9. ✅ Full API key should be displayed with warning
10. Copy the key and click "Done"
11. ✅ Key should appear in the list (masked)
12. Test navigation to other pages
13. ✅ All pages should load without errors

---

## 📊 Expected Behavior Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Sign In/Up | ✅ Working | Clerk handles auth |
| Dashboard Load | ✅ Working | Shows overview cards |
| API Keys Creation | ✅ Working | Full create/list/revoke flow |
| API Keys List | ✅ Working | Shows all keys with metadata |
| API Keys Copy | ✅ Working | Clipboard + toast feedback |
| API Keys Revoke | ✅ Working | With confirmation |
| Navigation | ✅ Working | All links functional |
| Theme | ✅ Working | Dark mode default |
| API Endpoints | ✅ Working | All CRUD operations |
| Error Handling | ✅ Working | Graceful degradation |
| Loading States | ✅ Working | Shown during async ops |
| Toast Notifications | ✅ Working | Success/error feedback |

---

**Last Updated**: 2026-01-14 12:05 PM  
**Service Running**: http://localhost:3001  
**Status**: Ready for browser testing ✅
