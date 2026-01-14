# Path Tracker - UI/UX Requirements

## 1. Overview

Path Tracker's web dashboard is a modern, intuitive interface for tenant owners to monitor, debug, and analyze their distributed system's request flows. The UI prioritizes clarity, speed, and actionable insights.

### Design Goals

- **Modern & Clean** - Contemporary design language, inspired by best-in-class observability tools
- **Data-Dense** - Surface maximum information without overwhelming users
- **Fast & Responsive** - Sub-second interactions, real-time updates where applicable
- **Actionable** - Every view should help users answer questions and solve problems

---

## 2. Design Principles

### Visual Design

**UI-1**: The interface SHALL use a modern, clean design system with:
- Dark mode as default (with light mode option)
- Consistent spacing and typography
- Clear visual hierarchy
- Subtle animations and transitions
- High contrast for readability

**UI-2**: Color coding SHALL be used consistently:
- **Green** - Success (HTTP 2xx)
- **Yellow/Orange** - Warnings (HTTP 4xx)
- **Red** - Errors (HTTP 5xx)
- **Blue** - LLM requests
- **Gray** - REST requests
- **Purple** - High-priority/starred items

**UI-3**: The design SHALL be inspired by modern observability tools (Datadog, Grafana, Vercel) but with a more contemporary aesthetic.

### Information Architecture

**UI-4**: Navigation SHALL be clear and persistent across all pages.

**UI-5**: Critical actions (create API key, filter logs) SHALL be easily accessible.

**UI-6**: Empty states SHALL provide clear guidance on next steps.

**UI-7**: Loading states SHALL use skeleton screens (not spinners).

### Request/Response Body Display

**UI-8**: **CRITICAL**: Request and response bodies SHALL **ALWAYS** be displayed with:
- **Pretty printing** - Formatted with proper indentation
- **Syntax highlighting** - Color-coded by JSON structure (keys, values, strings, numbers, booleans, null)
- **Line numbers** - For easy reference
- **Collapsible/expandable** - Each level of nesting can be collapsed/expanded
- **Copy button** - One-click copy of formatted JSON
- **Search functionality** - Find within the body (Ctrl+F)
- **Raw view toggle** - Switch between formatted and raw view

**UI-9**: Bodies SHALL use a monospace font (e.g., `Fira Code`, `JetBrains Mono`, or `Monaco`).

**UI-10**: Syntax highlighting color scheme SHALL be consistent with the dashboard theme (dark/light mode).

**UI-11**: This formatting SHALL apply to **all locations** where bodies are displayed:
- Request Paths side panel
- Logs side panel
- User requests detail view
- API testing interface (if added)
- Exported data

**UI-12**: Large bodies (> 1000 lines) SHALL use virtual scrolling for performance.

**Example: Pretty Printed JSON Body**
```
┌─────────────────────────────────────────────────┐
│ Request Body                          [Copy] [Raw]│
├─────────────────────────────────────────────────┤
│  1  {                                           │
│  2    "model": "gpt-4",                         │
│  3    "messages": [                             │
│  4      {                                       │
│  5        "role": "user",                       │
│  6        "content": "Hello, how are you?"      │
│  7      }                                       │
│  8    ],                                        │
│  9    "temperature": 0.7,                       │
│ 10    "max_tokens": 500                         │
│ 11  }                                           │
└─────────────────────────────────────────────────┘

Color Scheme (Dark Mode):
- Keys ("model", "messages"):     #7DD3FC (light blue)
- String values ("gpt-4"):        #86EFAC (green)
- Numbers (0.7, 500):             #FDE047 (yellow)
- Booleans/null:                  #C084FC (purple)
- Braces/brackets:                #94A3B8 (gray)
- Line numbers:                   #64748B (darker gray)
```

---

## 3. Pages & Navigation

### 3.1 Primary Navigation

**UI-13**: The dashboard SHALL have a persistent left sidebar navigation with the following pages:

```
┌─────────────────────────────────────────┐
│  [Logo] Path Tracker                    │
│         by Pathwave.io                  │
│                                         │
│  📊 Overview                            │
│  🔍 Request Paths                       │
│  📋 Logs                                │
│  📈 Metrics                             │
│  👥 Users                               │  ← New!
│  🔑 API Keys                            │
│  ⚙️  Settings                           │
│                                         │
│  ─────────────────                      │
│  👤 Alice (alice@example.com)          │
│     └─ Logout                           │
└─────────────────────────────────────────┘
```

**UI-13a**: The logo/branding SHALL display "Path Tracker" in bold/prominent text with "by Pathwave.io" in smaller, lighter text below it.

**UI-9**: Active page SHALL be highlighted in the navigation.

**UI-10**: Navigation SHALL be collapsible on smaller screens.

### 3.2 Page: Overview (Dashboard Home)

**UI-11**: The Overview page SHALL display key metrics for the selected time range (default: last 24 hours):

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Overview                                    [1d|1w|1m|Custom]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Total        │ │ LLM Requests │ │ Total Cost   │        │
│  │ Requests     │ │              │ │              │        │
│  │ 125,420      │ │ 8,420        │ │ $342.50      │        │
│  │ ↑ 12% vs 1d  │ │ ↑ 8% vs 1d   │ │ ↑ 15% vs 1d  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Avg Latency  │ │ Error Rate   │ │ Active Users │        │
│  │ 245ms        │ │ 1.2%         │ │ 1,420        │        │
│  │ ↓ 5% vs 1d   │ │ ↑ 0.3% vs 1d │ │ ↑ 22% vs 1d  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Requests Over Time                    [Hourly ▼]     │  │
│  │                                                       │  │
│  │  [Line chart: requests/hour, colored by success/error]│
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │ Top Services by Volume   │  │ Recent Errors        │    │
│  │ 1. api-gateway    45%    │  │ [List of recent      │    │
│  │ 2. ml-service     32%    │  │  failed requests     │    │
│  │ 3. db-service     18%    │  │  with quick links]   │    │
│  │ 4. auth-service    5%    │  │                      │    │
│  └──────────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**UI-12**: Metric cards SHALL show trend indicators (up/down arrows with percentage change).

**UI-13**: All metrics SHALL update based on the selected time range.

**UI-14**: Clicking on a metric card SHALL navigate to detailed view (e.g., click "Error Rate" → Logs page filtered by errors).

### 3.3 Page: Request Paths

**UI-15**: The Request Paths page is the core feature for visualizing distributed request flows.

#### 3.3.1 Request Path Search

**UI-16**: The page SHALL have a prominent search bar at the top:

```
┌─────────────────────────────────────────────────────────────┐
│ Request Paths                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 [Search by request_id or user_id...        ] [Search]   │
│      or select from recent:                                  │
│                                                              │
│  Recent Requests:                                           │
│  • req_abc123 (user_456) - 5 services, 3.2s                │
│  • req_def456 (user_789) - 3 services, 1.1s                │
│  • req_ghi789 (user_456) - 7 services, 5.8s (2 errors)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI-17**: Search SHALL support autocomplete for recent request_ids.

**UI-18**: Recent requests SHALL show: request_id, user_id, number of services, total duration, error indicator.

#### 3.3.2 Request Flow Visualization

**UI-19**: When a request_id is selected, the page SHALL display an **interactive flow diagram** showing the complete request path:

```
┌─────────────────────────────────────────────────────────────┐
│ Request Path: req_abc123                                     │
│ User: user_456 | Total Duration: 3,250ms | 5 services       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Timeline View  │  [Flow View]  │  [Table View]             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │   ┌──────────┐  250ms  ┌──────────┐  1200ms          │ │
│  │   │   API    │────────>│   Auth   │────────>         │ │
│  │   │ Gateway  │  200 ✓  │ Service  │  200 ✓           │ │
│  │   └──────────┘         └──────────┘                   │ │
│  │        │                                               │ │
│  │        │ 1500ms                                        │ │
│  │        v                                               │ │
│  │   ┌──────────┐  3500ms  ┌──────────┐                 │ │
│  │   │    ML    │────────>│  OpenAI  │                  │ │
│  │   │ Service  │  200 ✓  │   GPT-4  │                  │ │
│  │   └──────────┘         └──────────┘                   │ │
│  │        │                                               │ │
│  │        │ 300ms                                         │ │
│  │        v                                               │ │
│  │   ┌──────────┐                                        │ │
│  │   │    DB    │                                        │ │
│  │   │ Service  │                                        │ │
│  │   └──────────┘                                        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Side Panel - Collapsed]                                   │
└─────────────────────────────────────────────────────────────┘
```

**UI-20**: The flow diagram SHALL:
- Display services as **nodes** (boxes)
- Display requests as **edges** (arrows between nodes)
- Label edges with latency and status code
- Use color coding: green (2xx), yellow (4xx), red (5xx)
- Auto-layout nodes to avoid overlaps
- Support zoom and pan

**UI-21**: Nodes SHALL display:
- Service name
- Icon (REST or LLM indicator)
- Status indicator (color border)

**UI-22**: Edges SHALL display:
- Latency (in ms)
- Status code
- HTTP method (small label)

**UI-23**: LLM requests SHALL be visually distinct:
- Different icon (🤖)
- Blue accent color
- Show model name in node

#### 3.3.3 Request Details Side Panel

**UI-24**: When a user clicks on a node in the flow diagram, a **side panel SHALL expand from the right** showing full request details:

```
┌─────────────────────────────────────────────────────────────┐
│ Flow Diagram                        │ Request Details       │
│                                     │                       │
│  ┌─────────────────────────────┐   │ ┌───────────────────┐ │
│  │                             │   │ │ [×] Close         │ │
│  │   ┌──────────┐              │   │ ├───────────────────┤ │
│  │   │   API    │  ← Selected  │   │ │ API Gateway       │ │
│  │   │ Gateway  │              │   │ │                   │ │
│  │   └──────────┘              │   │ │ POST /api/chat    │ │
│  │        │                    │   │ │ Status: 200 ✓     │ │
│  │        v                    │   │ │ Latency: 250ms    │ │
│  │   ┌──────────┐              │   │ │                   │ │
│  │   │  Auth    │              │   │ ├───────────────────┤ │
│  │   │ Service  │              │   │ │ Timestamps        │ │
│  │   └──────────┘              │   │ │ Start: 10:30:00   │ │
│  │                             │   │ │ End:   10:30:00.2 │ │
│  │                             │   │ │                   │ │
│  └─────────────────────────────┘   │ ├───────────────────┤ │
│                                     │ │ Request Headers   │ │
│                                     │ │ [Collapsible]     │ │
│                                     │ │                   │ │
│                                     │ ├───────────────────┤ │
│                                     │ │ Request Body      │ │
│                                     │ │ [JSON viewer]     │ │
│                                     │ │                   │ │
│                                     │ ├───────────────────┤ │
│                                     │ │ Response Body     │ │
│                                     │ │ [JSON viewer]     │ │
│                                     │ │                   │ │
│                                     │ ├───────────────────┤ │
│                                     │ │ Metadata          │ │
│                                     │ │ [Key-value pairs] │ │
│                                     │ │                   │ │
│                                     │ └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**UI-25**: The side panel SHALL display:
- Service name and endpoint
- HTTP method and URL
- Status code with icon
- Latency
- Request/response timestamps
- Request headers (collapsible)
- Request body (formatted JSON with syntax highlighting)
- Response body (formatted JSON with syntax highlighting)
- Metadata (key-value pairs)

**UI-26**: For LLM requests, the side panel SHALL additionally show:
- Provider (OpenAI, Anthropic, etc.)
- Model (GPT-4, Claude-3, etc.)
- Token usage (prompt, completion, total)
- Cost in USD
- Estimated cost per token

**UI-27**: JSON bodies SHALL follow the formatting requirements defined in **UI-8 to UI-12** (pretty printing, syntax highlighting, collapsible, searchable, copyable, line numbers, raw view toggle)

**UI-28**: The side panel SHALL be closable via:
- Close button (×)
- Click outside panel
- ESC key

**UI-29**: Multiple nodes can be selected sequentially (side panel updates to show selected node).

### 3.4 Page: Logs

**UI-30**: The Logs page displays a searchable, filterable list of all requests.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Logs                                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filters:                                   [1d|1w|1m|Custom]│
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Environment│ │ Service  │ │ Status   │ │ Type     │     │
│  │ All ▼     │ │ All ▼    │ │ All ▼    │ │ All ▼    │     │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐                                               │
│  │ User ID  │                                               │
│  │ [input]  │                                               │
│  └──────────┘                                               │
│                                                              │
│  🔍 [Search request_id, url, or keywords...]                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Time    │Env│ Service    │ Endpoint        │ Status │Lat│
│  ├──────────────────────────────────────────────────────┤   │
│  │10:30:05│🟢│ api-gateway│ POST /chat      │  200 ✓│250ms│
│  │10:30:04│🔵│ ml-service │ POST /complete  │  200 ✓│3.5s│
│  │10:30:02│🟢│ db-service │ GET /user/456   │  200 ✓│120ms│
│  │10:30:01│🟡│ api-gateway│ GET /health     │  200 ✓│50ms│
│  │10:29:58│🟢│ ml-service │ POST /complete  │  500 ✗│2.1s│
│  │ ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Showing 1-50 of 15,420 results  [Prev] [Next]              │
└─────────────────────────────────────────────────────────────┘

Environment badges:
🟢 Production
🔵 Staging
🟡 Development/Local
```

**UI-31**: Filters SHALL be applied in real-time (no "Apply" button needed).

**UI-32**: The logs table SHALL display:
- Timestamp (relative: "2 minutes ago" or absolute)
- Service name
- Endpoint (method + path)
- Status code with color coding
- Latency

**UI-33**: Clicking on a row SHALL open the request details side panel (same as Request Paths page).

**UI-34**: Clicking on a request_id SHALL navigate to Request Paths page with that request loaded.

**UI-35**: The table SHALL support:
- Sorting by any column
- Pagination (50 results per page)
- Infinite scroll (optional)
- Export to CSV

**UI-36**: Error rows (5xx status) SHALL be highlighted with red background.

### 3.5 Page: Users

**UI-37**: The Users page allows tenant owners to analyze behavior and costs per end user.

#### 3.5.1 User Selection

**UI-38**: The page SHALL have a user picker at the top:

```
┌─────────────────────────────────────────────────────────────┐
│ Users                                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Select User:                                                │
│  🔍 [Search by user_id...                    ] [Search]     │
│                                                              │
│  Top Users (by requests):                                   │
│  • user_456 (15,420 requests, $45.60)                       │
│  • user_789 (8,200 requests, $28.30)                        │
│  • user_012 (5,100 requests, $12.40)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI-39**: User search SHALL support autocomplete from existing user_ids.

**UI-40**: Top users list SHALL be sortable by:
- Total requests
- Total cost
- Error rate
- Recent activity

#### 3.5.2 User Summary Dashboard

**UI-41**: When a user is selected, display a **summary dashboard** with key metrics:

```
┌─────────────────────────────────────────────────────────────┐
│ User: user_456                              [1d|1w|1m|Custom]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Total Cost   │ │ LLM Requests │ │ REST Requests│        │
│  │              │ │              │ │              │        │
│  │ $45.67       │ │ 420          │ │ 15,000       │        │
│  │ ↑ 12% vs 1d  │ │ ↑ 8% vs 1d   │ │ ↑ 15% vs 1d  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Avg Latency  │ │ Error Rate   │ │ Total Tokens │        │
│  │ 1.2s         │ │ 0.8%         │ │ 125,000      │        │
│  │ ↓ 5% vs 1d   │ │ ↓ 0.2% vs 1d │ │ ↑ 18% vs 1d  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Cost Over Time                        [Daily ▼]      │  │
│  │                                                       │  │
│  │  [Line chart: cost per day, stacked by service]      │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ LLM Usage Breakdown                                   │  │
│  │                                                       │  │
│  │  GPT-4:        320 requests  |  $42.50  | ████████  │  │
│  │  GPT-3.5:      100 requests  |  $3.17   | ██        │  │
│  │  Claude-3:       0 requests  |  $0.00   |           │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI-42**: Summary metrics SHALL include:
- **Total Cost** - Sum of all LLM costs for this user
- **LLM Requests** - Count of LLM API calls
- **REST Requests** - Count of REST API calls
- **Avg Latency** - Average response time across all requests
- **Error Rate** - Percentage of failed requests (4xx + 5xx)
- **Total Tokens** - Sum of all tokens used in LLM requests

**UI-43**: Timeline selector SHALL offer:
- **1d** - Last 24 hours
- **1w** - Last 7 days
- **1m** - Last 30 days
- **Custom** - Date range picker

**UI-44**: All metrics SHALL update based on selected timeline.

**UI-45**: Cost chart SHALL show:
- Daily/hourly breakdown (based on timeline)
- Stacked by service or model
- Tooltip on hover with exact values

**UI-46**: LLM Usage Breakdown SHALL show:
- Model name
- Request count
- Total cost
- Visual bar chart
- Click to filter requests below

#### 3.5.3 User Request List

**UI-47**: Below the summary, display a **filterable list of all requests** for this user:

```
│  Requests for user_456                    [All | LLM | REST] │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Time       │ Type│ Service    │ Endpoint    │ Status│Lat│
│  ├──────────────────────────────────────────────────────┤   │
│  │ 10:30:05  │ 🤖 │ ml-service │ GPT-4       │  200 ✓│3.5s│
│  │ 10:30:04  │ 📡│ api-gateway│ POST /chat  │  200 ✓│250ms│
│  │ 10:30:02  │ 📡│ db-service │ GET /user   │  200 ✓│120ms│
│  │ 10:29:58  │ 🤖 │ ml-service │ Claude-3    │  200 ✓│2.1s│
│  │ 10:29:55  │ 📡│ api-gateway│ POST /msg   │  500 ✗│1.5s│
│  │ ...                                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Showing 1-50 of 15,420 results  [Prev] [Next]              │
└─────────────────────────────────────────────────────────────┘
```

**UI-48**: Request list SHALL display:
- Timestamp
- Type indicator (🤖 for LLM, 📡 for REST)
- Service name
- Endpoint/model
- Status code with color
- Latency

**UI-49**: Request list SHALL support:
- Filter by type (All, LLM, REST)
- Search by endpoint/keyword
- Sort by any column
- Pagination
- Click to view request details (side panel)
- Click request_id to view full path

**UI-50**: The design SHALL be **modern and clean**, with:
- Card-based layout (not basic table)
- Smooth transitions
- Hover effects
- Visual hierarchy (metrics > charts > list)

**UI-51**: LLM requests SHALL show additional info on hover:
- Model name
- Token count
- Cost

### 3.6 Page: Metrics

**UI-52**: The Metrics page displays aggregated analytics and trends.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Metrics                                     [1d|1w|1m|Custom]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Request Volume                        [Hourly ▼]     │  │
│  │ [Line chart: requests over time]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Latency Distribution                                  │  │
│  │ [Line chart: p50, p95, p99 over time]               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │ Requests by Service      │  │ Requests by Status   │    │
│  │ [Pie chart]              │  │ [Donut chart]        │    │
│  └──────────────────────────┘  └──────────────────────┘    │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ LLM Cost Breakdown                                    │  │
│  │ [Stacked bar chart: cost by model per day]          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI-53**: Charts SHALL be interactive:
- Hover to see exact values
- Click legend to show/hide series
- Zoom and pan on time-series charts
- Click chart elements to filter (e.g., click service in pie chart → filter logs)

**UI-54**: Charts SHALL use a consistent color palette across the entire dashboard.

### 3.7 Page: API Keys

**UI-55**: The API Keys page allows management of API keys.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ API Keys                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Create New API Key]                                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Name              │ Created    │ Last Used │ Usage  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Production API    │ 2025-01-10 │ 2m ago    │ 15.4K  │🔧│
│  │ pwtrk_abc...45pq  │            │           │        │❌│
│  ├──────────────────────────────────────────────────────┤   │
│  │ Staging API       │ 2025-01-05 │ 10m ago   │ 3.4K   │🔧│
│  │ pwtrk_xyz...89ab  │            │           │        │❌│
│  ├──────────────────────────────────────────────────────┤   │
│  │ Test Key          │ 2024-12-01 │ Never     │ 0      │🔧│
│  │ pwtrk_old...23cd  │            │           │        │❌│
│  │ (Revoked)         │            │           │        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI-56**: Each API key row SHALL display:
- Name (editable inline or via edit icon)
- Masked key (pwtrk_abc...xyz)
- Created date
- Last used (relative time)
- Usage count
- Actions: Edit (🔧), Revoke (❌)

**UI-57**: Revoked keys SHALL be visually distinct (grayed out, "(Revoked)" label).

**UI-58**: Clicking "Create New API Key" SHALL open a modal:

```
┌───────────────────────────────────────┐
│ Create New API Key                    │
├───────────────────────────────────────┤
│                                       │
│ Name:                                 │
│ [Production API Key              ]    │
│                                       │
│ Expires (optional):                   │
│ [Never ▼]  or  [Date picker]          │
│                                       │
│                [Cancel] [Create Key]  │
└───────────────────────────────────────┘
```

**UI-59**: After creation, display success modal with the full API key:

```
┌───────────────────────────────────────┐
│ ⚠️  API Key Created                    │
├───────────────────────────────────────┤
│                                       │
│ Copy this key now. You won't be able │
│ to see it again!                      │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ pwtrk_abc123def456ghi789jkl012mn │ │
│ │                          [Copy 📋] │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Usage example:                        │
│ curl -H "Authorization: Bearer       │
│   pwtrk_abc123..." ...                │
│                                       │
│                          [I've Copied]│
└───────────────────────────────────────┘
```

**UI-60**: The key SHALL be displayed in a monospace font with a copy button.

**UI-61**: The modal SHALL not close until user clicks "I've Copied" (prevent accidental loss).

### 3.8 Page: Settings

**UI-62**: The Settings page allows configuration of tenant settings.

**Sections:**
- Profile (tenant name, email)
- Data Retention (retention period in days)
- Body Storage (enable/disable, size limit)
- PII Scrubbing (enable/disable, custom patterns)
- Rate Limits (requests per minute)
- Notifications (future: email alerts)

---

## 4. Core Features

### 4.1 Global Search

**UI-63**: A global search bar SHALL be available in the top navigation:

```
┌─────────────────────────────────────────────────────────────┐
│  Path Tracker by Pathwave.io    🔍 [Search...]    [Profile▼] │
└─────────────────────────────────────────────────────────────┘
```

**UI-64**: Global search SHALL support:
- Search by request_id → jump to Request Paths page
- Search by user_id → jump to Users page
- Keyboard shortcut (Cmd+K / Ctrl+K)

### 4.2 Time Range Selector

**UI-65**: A consistent time range selector SHALL be present on all pages that display time-based data.

**UI-66**: Time range options:
- **1d** - Last 24 hours (default)
- **1w** - Last 7 days
- **1m** - Last 30 days
- **Custom** - Date range picker (calendar UI)

**UI-67**: Selected time range SHALL persist across page navigation (stored in URL params).

### 4.3 Real-Time Updates

**UI-68**: The Overview page metrics SHALL update in real-time (refresh every 30 seconds).

**UI-69**: A visual indicator SHALL show when data is being refreshed.

**UI-70**: Users can manually trigger refresh with a refresh button.

### 4.4 Keyboard Shortcuts

**UI-71**: The dashboard SHALL support keyboard shortcuts:
- `Cmd+K` / `Ctrl+K` - Open global search
- `Cmd+/` / `Ctrl+/` - Show keyboard shortcuts help
- `ESC` - Close modals/side panels
- `G then O` - Go to Overview
- `G then P` - Go to Request Paths
- `G then L` - Go to Logs
- `G then U` - Go to Users
- `G then K` - Go to API Keys

**UI-72**: A keyboard shortcuts cheat sheet SHALL be accessible via `?` key.

---

## 5. Visualizations

### 5.1 Request Flow Diagram

**UI-73**: The request flow diagram SHALL use a directed graph layout:
- Nodes represent services/APIs
- Edges represent requests between them
- Edge thickness represents latency (thicker = slower)
- Edge color represents status (green/yellow/red)

**UI-74**: Layout algorithm SHALL:
- Position nodes left-to-right (chronological order)
- Avoid edge crossings where possible
- Auto-adjust layout when window resizes

**UI-75**: Diagram SHALL support:
- Pan (click and drag)
- Zoom (scroll or pinch)
- Fit to screen button
- Export as PNG/SVG

### 5.2 Charts

**UI-76**: All charts SHALL be built with a modern charting library (e.g., Recharts, Chart.js, or D3).

**UI-77**: Chart features:
- Responsive (adapt to container size)
- Interactive tooltips
- Legend (show/hide series)
- Export to PNG/CSV
- Dark mode support

**UI-78**: Time-series charts SHALL show timestamps on X-axis with smart formatting:
- Hour view: "10:00 AM"
- Day view: "Jan 14"
- Week view: "Mon 14"

---

## 6. UX Flows

### 6.1 First-Time User Onboarding

**UI-79**: When a new user logs in for the first time, show an **onboarding modal**:

```
┌───────────────────────────────────────┐
│ Welcome to Path Tracker! 🎉           │
├───────────────────────────────────────┤
│                                       │
│ Let's get you set up in 2 steps:     │
│                                       │
│ 1. Create your first API key         │
│ 2. Start tracking requests           │
│                                       │
│               [Skip] [Get Started]    │
└───────────────────────────────────────┘
```

**UI-80**: Onboarding flow:
1. Create API key (guided)
2. Show integration code snippet
3. Show example cURL command
4. Link to documentation

**UI-81**: Onboarding can be dismissed but should be re-accessible from settings.

### 6.2 Debugging a Request

**Scenario**: User wants to debug why a request failed.

**Flow**:
1. User goes to **Logs** page
2. Filters by status: 5xx (errors)
3. Sees failed request in table
4. Clicks on request → side panel opens
5. Reviews error response body
6. Clicks request_id → navigates to **Request Paths**
7. Views full flow diagram
8. Identifies which service failed (red node)
9. Clicks failed node → side panel shows error details
10. Copies error details or exports path diagram

**UI-82**: This flow SHALL be seamless (no unnecessary clicks).

### 6.3 Monitoring User Costs

**Scenario**: User wants to monitor how much a specific user is costing.

**Flow**:
1. User goes to **Users** page
2. Searches for user_id
3. Selects user
4. Sees cost summary at top
5. Reviews cost trend chart
6. Identifies spike in costs on specific day
7. Filters request list by that day
8. Sees high-volume LLM requests
9. Clicks on LLM request → reviews details
10. Identifies optimization opportunity

**UI-83**: The Users page SHALL make cost analysis effortless.

---

## 7. Components

### 7.1 Design System

**UI-84**: The UI SHALL use a consistent design system with reusable components:

**Core Components:**
- **Button** - Primary, secondary, danger, ghost variants
- **Input** - Text, number, date, search variants
- **Select** - Dropdown with search
- **Card** - Container for grouped content
- **Table** - Sortable, paginated data table
- **Modal** - Overlay for forms/confirmations
- **Side Panel** - Slide-in panel for details
- **Badge** - Status indicators (success, error, warning)
- **Tooltip** - Contextual help on hover
- **Loading** - Skeleton screens for loading states
- **Empty State** - Friendly message when no data

**UI-85**: Components SHALL be built with a component library (e.g., shadcn/ui, Radix UI, or Chakra UI).

### 7.2 Responsive Design

**UI-86**: The dashboard SHALL be fully responsive:
- **Desktop** (1920px+) - Full layout with sidebar
- **Laptop** (1280px-1920px) - Compact layout
- **Tablet** (768px-1280px) - Collapsible sidebar
- **Mobile** (< 768px) - Bottom navigation, stacked cards

**UI-87**: Flow diagrams SHALL adapt to smaller screens:
- Vertical layout on mobile
- Simplified nodes (icons only)
- Swipe to navigate between nodes

---

## 8. Accessibility

**UI-88**: The dashboard SHALL meet WCAG 2.1 AA standards:
- Keyboard navigable (all interactive elements)
- Screen reader friendly (proper ARIA labels)
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators visible
- Error messages descriptive

**UI-89**: All charts SHALL have accessible alternatives (data tables).

**UI-90**: Animations SHALL respect `prefers-reduced-motion`.

---

## 9. Performance

**UI-91**: Page load time SHALL be < 2 seconds (initial load).

**UI-92**: Interactions SHALL feel instant (< 100ms perceived latency).

**UI-93**: Large datasets (logs, metrics) SHALL use:
- Virtualization for long lists
- Pagination or infinite scroll
- Server-side filtering

**UI-94**: Images and icons SHALL be optimized (SVG or WebP).

---

## 10. Technology Stack (Recommendations)

**UI-95**: The UI SHALL be built with:
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui or Radix UI
- **Charts**: Recharts or Victory
- **Flow Diagrams**: React Flow or D3.js
- **JSON Viewer**: `react-json-view` or `@uiw/react-json-view` (with syntax highlighting & pretty printing)
- **Code Editor** (for bodies): Monaco Editor or CodeMirror (optional, for advanced editing)
- **State Management**: Zustand or React Query
- **Authentication**: Clerk React SDK

---

## 11. Success Criteria

The UI will be considered successful when:

✅ Users can visualize a request path in < 5 clicks  
✅ Request details load in < 500ms  
✅ Cost analysis per user is clear and actionable  
✅ API key management is intuitive  
✅ UI feels modern and professional  
✅ Onboarding takes < 2 minutes  
✅ Users report "easy to use" in feedback  

---

*Last Updated: January 14, 2026*
