# AITU Attendance System — Complete Backend Specification & System Analysis

**Document Version:** 1.0.0  
**Generated Date:** July 28, 2026  
**Target Application:** Assiut International Technological University (AITU) — Attendance Management System (`جامعة أسيوط التِّكْنُولُوجِيَّةُ الدَّوْلِيَّةُ — نظام تسجيل الحضور والغياب`)  
**Target Repository:** `e:/Projects/Web/Attendance APP/aitu-attendance`  

---

# 1. Executive Summary

### Project Purpose
The AITU Attendance Management System is a comprehensive, multi-role web enterprise portal built for **Assiut International Technological University (AITU)**. The primary objective of the system is to digitize and automate workforce management operations across the university's academic faculties and administrative divisions. Key business goals include:
- **GPS-Verified Real-Time Attendance**: Enforcing physical campus presence (within a 500-meter geofenced campus radius) for employee check-ins and check-outs via browser geolocation services.
- **Automated Leave Lifecycle**: Managing leave entitlements, application rules (annual, sick, urgent, maternity, compensatory, unpaid, grant), approval workflows, and fiscal leave-year tracking (July 1 to June 30).
- **Monthly Permission Budgeting**: Enforcing monthly time allowances (240 minutes/month) for morning/evening permissions, along with non-deductible exceptional and nursing permission handling for eligible employees.
- **Work Schedule Engine**: Defining flexible and fixed work schedules, daily working hours, flexible bandwidth, and targeted organizational unit assignments.
- **Organizational Hierarchy & Structure**: Managing university structure across academic colleges, academic departments, and central administrative departments.
- **Executive Analytics & Reporting**: Providing real-time dashboard KPIs, attendance distribution charts, monthly trends, and Excel/CSV data exports.

### System Overview
The application is currently implemented as a client-side Single-Page Application (SPA) leveraging React 19, custom CSS components, and Firebase Firestore client integrations. The application state relies on client-side mock data collections (`data.js`) alongside direct Firestore set operations (`seedData.js`, `firebase.js`). 

This document defines the complete **production-grade RESTful microservice/monolith backend architecture** required to replace client-side mock state and Firebase SDK dependencies with a robust, scalable backend infrastructure.

### Main Business Domains
1. **Authentication & Identity Management (IAM)**: User login, session handling, Role-Based Access Control (RBAC), and JWT token management.
2. **Organization Structure Management**: Administration of Colleges (`Faculty`), Academic Departments, Central Administrative Departments, and Academic Ranks.
3. **Employee Information Management (HRIS)**: Employee profile lifecycle, contact credentials, demographic data, role/department/college associations.
4. **GPS Geofenced Attendance Engine**: Geofence distance calculation (Haversine formula), origin security validation, attendance logging (`present`, `late`, `left`, `absent`), and daily shift processing.
5. **Leave & Grant Management Engine**: Rule enforcement (Friday weekend exclusion, leave year period July 1 - June 30, current-week urgent limits, Saturday-worked compensatory limits, maternity calculation modes), management grants, and multi-tier approval workflows.
6. **Permission Budgeting Engine**: Monthly 240-minute quota consumption tracking, morning/evening duration deductions, non-deductible emergency (45 min) permissions, and daily nursing hour locks.
7. **Shift & Work Schedule Configuration**: Fixed check-in/out scheduling vs flexible hours, daily hours computation, and organizational assignment engine.
8. **Reporting & Business Intelligence (BI)**: Attendance rate aggregations, monthly trends, absence tracking, smart alerts, and XLSX/CSV reporting services.

### Main Features
- **Multi-Role Portal**: Custom tailored user interfaces and menu actions for `admin`, `hr`, `head`, and `employee`.
- **GPS Campus Attendance Verification**: Multi-strategy GPS location resolution (High Accuracy GPS with fallback to Network Location) verifying proximity to campus latitude `27.184187`, longitude `31.172920` within 500m (+ GPS accuracy margin).
- **Smart Notification System**: Automated hooks identifying low permission balances (< 60 min), low annual leave balances (<= 3 days), unexcused current-day absences, 2+ consecutive absence alerts, and pending management review items.
- **Leave Request Engine**: Dynamic date range validation excluding non-working Fridays, calculating exact working days, and enforcing balance caps.
- **Grant Leave Modal**: Multi-scope management leave grant issuance targeting individual employees, selected department lists, or university-wide staff.
- **Live Attendance Map & Department Donuts**: Visual representation of department-level attendance distributions and real-time status counts.
- **Multi-Format Export**: Client-side and server-assisted Excel (`.xlsx`) and CSV generation.

### User Roles
- **System Admin (`admin`)**: Superuser with full system access. Manages workforce profiles, organizational structure, schedule policies, leave grants, global attendance logs, and university-wide analytics.
- **HR Manager (`hr`)**: Human Resources supervisor. Manages employee profiles, views full university attendance/leaves/permissions logs, exports compliance data, and accesses personal employee self-service features.
- **Department Head (`head` / `head_department`)**: Academic Department Head or Administrative Manager. Reviews and approves/rejects leave and permission applications from employees within their specific department (`departmentId`), monitors daily department attendance logs and KPI donuts.
- **Employee (`employee`)**: Academic staff (Professors, Lecturers, Demonstrators) or Administrative staff. Performs GPS check-in/out, applies for personal leaves and permissions, views personal attendance records, and monitors remaining leave/permission balances.

### High-Level Architecture
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Tier (Browser SPA)                              │
│  React 19 | Custom Theme Design System | Geolocation API | SheetJS Export Exporter    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                  HTTPS / REST / JSON
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                  API Gateway / Edge Layer                              │
│             TLS Termination | Rate Limiting | CORS Policy | JWT Auth Guard             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                 Backend Application Tier                               │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ Auth & IAM Module │ │ Attendance Engine │ │ Leave & Perm Engine│ │ HR & Admin Engine│  │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘ └──────────────────┘  │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ Notification Svc  │ │ Schedule Policy   │ │ Structure Engine  │ │ Report Exporter  │  │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘ └──────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                Database & Storage Tier                                 │
│   Relational DB (PostgreSQL / MySQL)  |  Cache (Redis)  | Cloud Object Storage (S3)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Frontend Stack**: React 19 (`react` ^19.2.6, `react-dom` ^19.2.6), `react-scripts` 5.0.1, Vanilla JavaScript CSS Design System (`src/theme.js`), SheetJS (XLSX).
- **Backend Stack (Proposed Specification)**: Node.js (NestJS / Express) or Java (Spring Boot) / Go, RESTful JSON Web APIs, OpenAPI 3.0.
- **Database Engine (Proposed Specification)**: PostgreSQL 15+ or MySQL 8.0+ Relational Database.
- **Caching Layer (Proposed Specification)**: Redis (session caching, monthly permission budget caching, rate limiting).
- **External Integrations**:
  - Browser HTML5 Geolocation API (`navigator.geolocation`)
  - SheetJS / Excel Export Engine
  - Firebase Web SDK (`firebase/app`, `firebase/firestore`) — *Targeted for migration to custom REST backend*
  - Google Fonts (`Cairo` typography)

---

# 2. Project Structure Analysis

The repository follows a clean, component-oriented React application structure:

```
aitu-attendance/
├── package.json               # Node package configuration and dependency definitions
├── README.md                  # Project overview and documentation
├── logo.png / background.png  # Primary branding and background visual assets
├── public/                    # Static web assets (index.html, manifest, icons)
└── src/
    ├── App.js                 # Core Root Component: Language translation state, auth user state, page routing dispatcher
    ├── App.css                # Global CSS styles and layout resets
    ├── index.js               # React application entry point (ReactDOM rendering)
    ├── theme.js               # Unified Design System: Palette (C), Spacing (S), Typography (F), helper components (Btn, Modal, StatCard, StatusBadge)
    ├── data.js                # Initial mock dataset (USERS, COLLEGES, DEPARTMENTS, EMPLOYEES, ATTENDANCE, LEAVES, PERMISSIONS)
    ├── seedData.js            # Firestore seeding utility populating Firebase collections ('colleges', 'departments', 'employees')
    ├── firebase.js            # Firebase App and Firestore database initialization (`db`)
    ├── components/            # Shared structural layout and navigation components
    │   ├── Header.js          # Top navigation bar, university title, user profile display, language toggle (Ar/En), logout handler
    │   ├── Sidebar.js         # Vertical navigation sidebar, role-filtered navigation items, active page indicator
    │   └── LoginPage.js       # User login page, credential form inputs, quick demo account login buttons, authentication handler
    └── pages/                 # Domain page views and business logic controllers
        ├── Dashboard.js         # System Admin Dashboard: KPIs, live attendance map, monthly trend chart, workforce breakdown
        ├── Employeedashboard.js # Employee Personal Dashboard: Attendance clock, quick stats, schedule calendar, exams tracker
        ├── Headdashboard.js     # Department Head Dashboard: Department attendance donut, employee permission balances, quick actions
        ├── HrDashboard.js       # HR Manager Dashboard: University workforce statistics, attendance logs, leave/permission summaries
        ├── Attendance.js        # Employee Attendance Check-in/out page: GPS geolocation verification, campus distance calculation, time clock
        ├── AttendanceAdmin.js   # System Admin Attendance Log: Full attendance table/cards view, filters, search, modal export
        ├── HrAttendance.js      # HR Attendance/Leaves/Permissions combined viewer with advanced filtering and Excel export
        ├── Employees.js         # System Admin Employee Management: Employee grid/table, add/edit modal forms, search and filter
        ├── HrEmployees.js       # HR Employee Directory: Employee filtering by type/gender/dept/college, export functionality
        ├── AddEmployeeForm.jsx  # Add Employee Form Component: Arabic/English validation, role-specific field inputs (academic rank, dept)
        ├── Leaves.js            # Admin Schedules & Grants page: Management leave grant wizard, work schedule policy builder, leave log table
        ├── Employeeleaves.js    # Employee Personal Leaves page: Leave balance cards, application modal with Friday/date validation
        ├── Headleaves.js        # Dept Head Leaves Review page: Pending leave requests cards, approve/reject modal with reason input
        ├── Permissions.js       # Employee Personal Permissions page: Monthly 240-minute donut, permission application modal (morning, evening, exceptional, nursing)
        ├── Headpermissions.js  # Dept Head Permissions Review page: Pending permission requests cards, approve/reject handlers
        ├── Reports.js           # Reports & Statistics page: Attendance vs Leave reports, departmental attendance breakdown, Excel export
        ├── Structure.js         # Organizational Structure page: CRUD operations for Colleges, Academic Depts, Administrative Depts
        ├── leaveValidation.js   # Shared Business Logic Engine: Leave year period (July 1 - June 30), monthly permission period, Friday exclusion logic, validation rules
        └── useNotifications.js  # Shared Notifications Custom Hook: Evaluates user role and dataset state to generate real-time actionable notifications
```

---

# 3. Functional Modules

### 1. Authentication & Session Module
- **Description**: Handles user identity verification, credentials matching, role resolution, and session management.
- **Main Screens**: `LoginPage.js`
- **Related Components**: `Header.js` (logout action), `App.js` (root user state)
- **Related Services**: Auth Service, Token Manager
- **Related Models**: `User`, `Employee`
- **Business Purpose**: Ensures secure access control and guarantees users interact only with UI features permitted for their role (`admin`, `hr`, `head`, `employee`).

### 2. Employee Profile & Directory Module
- **Description**: Manages complete employee lifecycle records, job classification, academic ranks, contact information, gender, and department/college affiliations.
- **Main Screens**: `Employees.js`, `HrEmployees.js`, `AddEmployeeForm.jsx`
- **Related Components**: `Sidebar.js`, `Dashboard.js` (workforce cards)
- **Related Services**: Employee Service, Department Service, College Service
- **Related Models**: `Employee`, `User`, `Department`, `College`
- **Business Purpose**: Maintains authoritative demographic and organizational placement data required for payroll, attendance tracking, and approval hierarchies.

### 3. Geofenced Attendance Engine Module
- **Description**: Executes client-side GPS location capture, validates proximity to campus geofencing coordinates, calculates Haversine distance, enforces check-in/out time logic, and records attendance records.
- **Main Screens**: `Attendance.js`, `AttendanceAdmin.js`, `HrAttendance.js`
- **Related Components**: `Header.js`, `Dashboard.js` (Live Attendance Map)
- **Related Services**: Geolocation Service, Attendance Service
- **Related Models**: `Attendance`, `Employee`, `Department`
- **Business Purpose**: Ensures proof of physical presence on university grounds for check-ins, calculates arrival timeliness (`present` vs `late`), and flags unexcused absences.

### 4. Leave & Grant Management Module
- **Description**: Governs the application, validation, balance calculation, and multi-level approval workflow for annual, sick, urgent, compensatory, maternity, grant, and unpaid leaves.
- **Main Screens**: `Leaves.js`, `Employeeleaves.js`, `Headleaves.js`
- **Related Components**: `leaveValidation.js`, `useNotifications.js`
- **Related Services**: Leave Service, Validation Service, Notification Service
- **Related Models**: `LeaveRequest`, `LeaveType`, `Employee`, `User`
- **Business Purpose**: Enforces Egyptian labor and university regulations regarding leave entitlements, fiscal leave years (July 1 – June 30), and managerial leave grants.

### 5. Permission Budgeting Module
- **Description**: Tracks short-duration employee absences during working hours, enforcing a 240-minute monthly budget for morning/evening permissions while managing non-deductible exceptional (45 min) and nursing (1 hr daily) permissions.
- **Main Screens**: `Permissions.js`, `Headpermissions.js`, `HrAttendance.js` (Permissions tab)
- **Related Components**: `leaveValidation.js`, `useNotifications.js`
- **Related Services**: Permission Service, Validation Service
- **Related Models**: `PermissionRequest`, `Employee`
- **Business Purpose**: Regulates short-term official or personal departures without incurring full-day leave deductions while protecting monthly quotas.

### 6. Work Schedule & Shift Policy Module
- **Description**: Allows administrators to configure university-wide, department-specific, or employee-level working hours, fixed shifts, flexible daily bandwidths, and weekly working days.
- **Main Screens**: `Leaves.js` (Work Schedules tab), `Employeedashboard.js` (Next Week Schedule component)
- **Related Components**: `Dashboard.js`
- **Related Services**: Schedule Service
- **Related Models**: `WorkSchedule`, `ScheduleAssignment`
- **Business Purpose**: Provides baseline check-in/out thresholds required to calculate late arrivals, early departures, and overtime allowances.

### 7. Organizational Structure Module
- **Description**: Maintains the institutional hierarchy across academic colleges, academic departments, and central administrative divisions.
- **Main Screens**: `Structure.js`
- **Related Components**: `AddEmployeeForm.jsx`
- **Related Services**: Structure Service
- **Related Models**: `College`, `Department`
- **Business Purpose**: Establishes administrative parent-child relationships required for organizational reporting, department head assignment, and filtered analytics.

### 8. Analytics & Reporting Engine Module
- **Description**: Aggregates attendance statistics, absence rates, monthly trends, departmental compliance donuts, and formats exportable reports in Excel (`.xlsx`) or CSV.
- **Main Screens**: `Reports.js`, `Dashboard.js`, `HrDashboard.js`, `Headdashboard.js`
- **Related Components**: SheetJS (`window.XLSX`), `theme.js` (exportExcel helper)
- **Related Services**: Reporting Service, Export Service
- **Related Models**: All Entities
- **Business Purpose**: Equips university executive leadership and HR managers with real-time operational insights into workforce attendance and leave consumption.

---

# 4. Database Design

Below is the complete inferred relational database schema required to support all application workflows.

## Table: `colleges`
**Purpose**: Stores university academic faculties/colleges.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(36)` | No | - | Primary Key (e.g. `'FIT'`, `'FE'`, `'FBS'`) |
| `name` | `VARCHAR(150)` | No | - | Arabic College Name |
| `name_en` | `VARCHAR(150)` | No | - | English College Name |
| `code` | `VARCHAR(20)` | No | - | Unique College Code |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |
| `deleted_at` | `TIMESTAMP` | Yes | `NULL` | Soft delete timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: None
- **Relationships**: 1:N with `departments`, 1:N with `employees`
- **Indexes**: `idx_colleges_code` (`code`) UNIQUE
- **Unique Constraints**: `code`
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: `deleted_at`

---

## Table: `departments`
**Purpose**: Stores academic departments and administrative divisions.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(36)` | No | - | Primary Key (e.g. `'CS'`, `'IS'`, `'HR'`, `'FIN'`) |
| `name` | `VARCHAR(150)` | No | - | Arabic Department Name |
| `name_en` | `VARCHAR(150)` | No | - | English Department Name |
| `code` | `VARCHAR(20)` | No | - | Department Code |
| `dept_type` | `VARCHAR(20)` | No | `'academic'` | Type: `'academic'` or `'administrative'` |
| `college_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `colleges.id` (mandatory for academic) |
| `parent_type` | `VARCHAR(20)` | Yes | `NULL` | Admin parent type: `'college'`, `'admin'`, `'university'` |
| `parent_id` | `VARCHAR(36)` | Yes | `NULL` | Parent admin department ID (Self FK) |
| `function_description` | `TEXT` | Yes | `NULL` | Department functional responsibilities |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |
| `deleted_at` | `TIMESTAMP` | Yes | `NULL` | Soft delete timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: 
  - `college_id` → `colleges(id)` ON DELETE SET NULL
  - `parent_id` → `departments(id)` ON DELETE SET NULL
- **Relationships**: Belongs to `college` (optional), self-referential parent/child, 1:N with `employees`
- **Indexes**: `idx_depts_college` (`college_id`), `idx_depts_type` (`dept_type`)
- **Unique Constraints**: `code`
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: `deleted_at`

---

## Table: `users`
**Purpose**: Authentication credentials and security role claims.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `BIGINT` | No | Auto | Primary Key |
| `email` | `VARCHAR(150)` | No | - | Unique login email address |
| `password_hash` | `VARCHAR(255)` | No | - | Encrypted password string |
| `role` | `VARCHAR(30)` | No | `'employee'` | Role: `'admin'`, `'hr'`, `'head'`, `'employee'` |
| `employee_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `employees.id` |
| `is_active` | `BOOLEAN` | No | `TRUE` | User account active flag |
| `last_login_at` | `TIMESTAMP` | Yes | `NULL` | Last successful authentication timestamp |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |
| `deleted_at` | `TIMESTAMP` | Yes | `NULL` | Soft delete timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: `employee_id` → `employees(id)` ON DELETE CASCADE
- **Relationships**: 1:1 with `employee`
- **Indexes**: `idx_users_email` (`email`) UNIQUE, `idx_users_role` (`role`)
- **Unique Constraints**: `email`, `employee_id`
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: `deleted_at`

---

## Table: `employees`
**Purpose**: Core employee human resource profiles.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(36)` | No | - | Primary Key (e.g. `'EMP001'`) |
| `name` | `VARCHAR(150)` | No | - | Arabic Full Name |
| `name_en` | `VARCHAR(150)` | No | - | English Full Name |
| `email` | `VARCHAR(150)` | No | - | Official University Email |
| `phone` | `VARCHAR(30)` | No | - | Contact Mobile Number |
| `gender` | `VARCHAR(10)` | No | `'male'` | Gender: `'male'` or `'female'` |
| `role_classification` | `VARCHAR(30)` | No | `'academic'` | Classification: `'academic'`, `'administrative'`, `'head_department'`, `'dean'` |
| `type` | `VARCHAR(20)` | No | `'academic'` | Staff Category: `'academic'` or `'administrative'` |
| `academic_rank` | `VARCHAR(50)` | Yes | `NULL` | Rank: `'معيد'`, `'مدرس مساعد'`, `'مدرس'`, `'أستاذ مساعد'`, `'أستاذ دكتور'` |
| `department_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `departments.id` |
| `college_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `colleges.id` |
| `head_type` | `VARCHAR(20)` | Yes | `NULL` | Head Category: `'academic'` or `'administrative'` |
| `status` | `VARCHAR(20)` | No | `'active'` | Employment Status: `'active'`, `'inactive'`, `'terminated'` |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |
| `deleted_at` | `TIMESTAMP` | Yes | `NULL` | Soft delete timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: 
  - `department_id` → `departments(id)` ON DELETE SET NULL
  - `college_id` → `colleges(id)` ON DELETE SET NULL
- **Relationships**: 1:1 with `user`, Belongs to `department`, Belongs to `college`, 1:N with `attendance_logs`, 1:N with `leave_requests`, 1:N with `permission_requests`
- **Indexes**: `idx_emp_dept` (`department_id`), `idx_emp_college` (`college_id`), `idx_emp_type` (`type`), `idx_emp_status` (`status`)
- **Unique Constraints**: `email`
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: `deleted_at`

---

## Table: `attendance_logs`
**Purpose**: Daily employee GPS check-in/out logs and calculated status.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(50)` | No | - | Primary Key (e.g. `'ATT_E03_01'`) |
| `employee_id` | `VARCHAR(36)` | No | - | Foreign Key to `employees.id` |
| `date` | `DATE` | No | - | Attendance Date (`YYYY-MM-DD`) |
| `check_in` | `TIME` | Yes | `NULL` | Check-in time |
| `check_out` | `TIME` | Yes | `NULL` | Check-out time |
| `status` | `VARCHAR(20)` | No | `'absent'` | Status: `'present'`, `'late'`, `'left'`, `'absent'` |
| `latitude` | `DECIMAL(10,8)` | Yes | `NULL` | GPS Check-in Latitude |
| `longitude` | `DECIMAL(11,8)` | Yes | `NULL` | GPS Check-in Longitude |
| `gps_accuracy` | `DECIMAL(8,2)` | Yes | `NULL` | GPS Accuracy Radius in meters |
| `distance_from_campus`| `DECIMAL(8,2)` | Yes | `NULL` | Calculated distance from campus center (meters) |
| `resolution_method` | `VARCHAR(20)` | Yes | `NULL` | Strategy: `'gps-high'` or `'network'` |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: `employee_id` → `employees(id)` ON DELETE CASCADE
- **Relationships**: Belongs to `employee`
- **Indexes**: `idx_att_emp_date` (`employee_id`, `date`) UNIQUE, `idx_att_date` (`date`), `idx_att_status` (`status`)
- **Unique Constraints**: (`employee_id`, `date`)
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: None (Hard audit record)

---

## Table: `leave_types`
**Purpose**: Lookup table configuring leave categories and statutory rules.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(30)` | No | - | Primary Key (`'annual'`, `'sick'`, `'urgent'`, `'compensatory'`, `'grant'`, `'maternity'`, `'unpaid'`) |
| `name` | `VARCHAR(100)` | No | - | Arabic Name |
| `name_en` | `VARCHAR(100)` | No | - | English Name |
| `max_annual_days` | `INT` | No | `0` | Default entitlement quota per leave-year |
| `women_only` | `BOOLEAN` | No | `FALSE` | Female entitlement restriction flag |
| `admin_only` | `BOOLEAN` | No | `FALSE` | Management-issuance restriction flag |
| `color_hex` | `VARCHAR(10)` | Yes | `NULL` | UI Badge color token |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: None
- **Relationships**: 1:N with `leave_requests`
- **Indexes**: `idx_leave_types_id` (`id`)
- **Unique Constraints**: None
- **Audit Fields**: `created_at`
- **Soft Delete**: None

---

## Table: `leave_requests`
**Purpose**: Employee leave applications, manager grants, and lifecycle approvals.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(50)` | No | - | Primary Key (e.g. `'LEV001'`) |
| `employee_id` | `VARCHAR(36)` | No | - | Foreign Key to `employees.id` |
| `leave_type_id` | `VARCHAR(30)` | No | - | Foreign Key to `leave_types.id` |
| `from_date` | `DATE` | No | - | Leave Start Date |
| `to_date` | `DATE` | No | - | Leave End Date |
| `days_count` | `INT` | No | - | Calculated working days count (excluding Fridays) |
| `status` | `VARCHAR(20)` | No | `'pending'` | Status: `'pending'`, `'approved'`, `'rejected'` |
| `reason` | `TEXT` | No | - | Applicant reason or grant note |
| `rejection_note` | `TEXT` | Yes | `NULL` | Manager rejection rationale |
| `manager_id` | `VARCHAR(36)` | Yes | `NULL` | Approving Manager/Admin Foreign Key |
| `granted_by_admin` | `BOOLEAN` | No | `FALSE` | Admin management-issuance flag |
| `maternity_mode` | `VARCHAR(20)` | Yes | `NULL` | Mode: `'birth'` or `'ninth'` (Maternity only) |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Application creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: 
  - `employee_id` → `employees(id)` ON DELETE CASCADE
  - `leave_type_id` → `leave_types(id)` ON DELETE RESTRICT
  - `manager_id` → `employees(id)` ON DELETE SET NULL
- **Relationships**: Belongs to `employee`, Belongs to `leave_type`, Approved by `manager`
- **Indexes**: `idx_leaves_emp` (`employee_id`), `idx_leaves_status` (`status`), `idx_leaves_dates` (`from_date`, `to_date`)
- **Unique Constraints**: None
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: None

---

## Table: `permission_requests`
**Purpose**: Hourly permission requests, emergency permissions, and nursing allowances.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `VARCHAR(50)` | No | - | Primary Key (e.g. `'PRM001'`) |
| `employee_id` | `VARCHAR(36)` | No | - | Foreign Key to `employees.id` |
| `permission_type` | `VARCHAR(30)` | No | - | Type: `'morning'`, `'evening'`, `'exceptional'`, `'nursing'`, `'late_arrive'`, `'early_leave'` |
| `date` | `DATE` | Yes | `NULL` | Permission Date (NULL for monthly recurring nursing) |
| `duration_minutes` | `INT` | No | - | Requested Duration in minutes (e.g. 30, 45, 60, 90) |
| `status` | `VARCHAR(20)` | No | `'pending'` | Status: `'pending'`, `'approved'`, `'rejected'` |
| `reason` | `TEXT` | No | - | Applicant justification |
| `rejection_note` | `TEXT` | Yes | `NULL` | Manager rejection note |
| `approved_by` | `VARCHAR(36)` | Yes | `NULL` | Manager Foreign Key |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: 
  - `employee_id` → `employees(id)` ON DELETE CASCADE
  - `approved_by` → `employees(id)` ON DELETE SET NULL
- **Relationships**: Belongs to `employee`
- **Indexes**: `idx_perm_emp` (`employee_id`), `idx_perm_date` (`date`), `idx_perm_status` (`status`)
- **Unique Constraints**: None
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: None

---

## Table: `work_schedules`
**Purpose**: System work schedules and shift policy rules.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `BIGINT` | No | Auto | Primary Key |
| `title` | `VARCHAR(150)` | No | - | Policy Title |
| `time_mode` | `VARCHAR(20)` | No | `'fixed'` | Mode: `'fixed'` or `'flexible'` |
| `check_in_time` | `TIME` | Yes | `'08:00'` | Fixed Shift Start Time |
| `check_out_time` | `TIME` | Yes | `'16:00'` | Fixed Shift End Time |
| `hours_per_day` | `DECIMAL(4,2)` | No | `8.00` | Mandatory daily working hours |
| `days_per_week` | `INT` | No | `5` | Working days count per week |
| `target_scope` | `VARCHAR(20)` | No | `'all'` | Scope: `'all'`, `'academic'`, `'admin'`, `'dept'`, `'employee'` |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record update timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: None
- **Relationships**: 1:N with `schedule_assignments`
- **Indexes**: `idx_sched_scope` (`target_scope`)
- **Unique Constraints**: None
- **Audit Fields**: `created_at`, `updated_at`
- **Soft Delete**: None

---

## Table: `schedule_assignments`
**Purpose**: Junction table binding schedules to specific departments or employees.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `BIGINT` | No | Auto | Primary Key |
| `schedule_id` | `BIGINT` | No | - | Foreign Key to `work_schedules.id` |
| `department_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `departments.id` |
| `employee_id` | `VARCHAR(36)` | Yes | `NULL` | Foreign Key to `employees.id` |

- **Primary Key**: `id`
- **Foreign Keys**: 
  - `schedule_id` → `work_schedules(id)` ON DELETE CASCADE
  - `department_id` → `departments(id)` ON DELETE CASCADE
  - `employee_id` → `employees(id)` ON DELETE CASCADE
- **Relationships**: Junction connecting `work_schedules` to `departments` or `employees`
- **Indexes**: `idx_sched_assign_dept` (`department_id`), `idx_sched_assign_emp` (`employee_id`)
- **Unique Constraints**: None
- **Audit Fields**: None

---

## Table: `exam_schedules`
**Purpose**: Academic exam timetable entries for faculty staff.

### Fields
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `BIGINT` | No | Auto | Primary Key |
| `employee_id` | `VARCHAR(36)` | No | - | Foreign Key to `employees.id` |
| `title` | `VARCHAR(150)` | No | - | Subject / Exam Name |
| `date` | `DATE` | No | - | Exam Date |
| `time_slot` | `VARCHAR(50)` | Yes | `NULL` | Exam Start/End Time String |
| `room_location` | `VARCHAR(100)` | Yes | `NULL` | Hall / Room Number |
| `notes` | `TEXT` | Yes | `NULL` | Additional Proctoring Notes |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | Record creation timestamp |

- **Primary Key**: `id`
- **Foreign Keys**: `employee_id` → `employees(id)` ON DELETE CASCADE
- **Relationships**: Belongs to `employee`
- **Indexes**: `idx_exams_emp_date` (`employee_id`, `date`)
- **Unique Constraints**: None
- **Audit Fields**: `created_at`

---

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    COLLEGES ||--o{ DEPARTMENTS : contains
    COLLEGES ||--o{ EMPLOYEES : employs
    DEPARTMENTS ||--o{ DEPARTMENTS : "parent of"
    DEPARTMENTS ||--o{ EMPLOYEES : assigns
    EMPLOYEES ||--|| USERS : authenticates
    EMPLOYEES ||--o{ ATTENDANCE_LOGS : records
    EMPLOYEES ||--o{ LEAVE_REQUESTS : submits
    EMPLOYEES ||--o{ PERMISSION_REQUESTS : submits
    EMPLOYEES ||--o{ EXAM_SCHEDULES : assigned
    LEAVE_TYPES ||--o{ LEAVE_REQUESTS : categorizes
    WORK_SCHEDULES ||--o{ SCHEDULE_ASSIGNMENTS : defines
    DEPARTMENTS ||--o{ SCHEDULE_ASSIGNMENTS : binds
    EMPLOYEES ||--o{ SCHEDULE_ASSIGNMENTS : binds

    COLLEGES {
        string id PK
        string name
        string name_en
        string code UK
    }

    DEPARTMENTS {
        string id PK
        string name
        string name_en
        string code UK
        string dept_type
        string college_id FK
        string parent_id FK
    }

    USERS {
        bigint id PK
        string email UK
        string password_hash
        string role
        string employee_id FK
        boolean is_active
    }

    EMPLOYEES {
        string id PK
        string name
        string name_en
        string email UK
        string phone
        string gender
        string role_classification
        string type
        string academic_rank
        string department_id FK
        string college_id FK
        string status
    }

    ATTENDANCE_LOGS {
        string id PK
        string employee_id FK
        date date
        time check_in
        time check_out
        string status
        decimal latitude
        decimal longitude
        decimal distance_from_campus
    }

    LEAVE_TYPES {
        string id PK
        string name
        string name_en
        int max_annual_days
        boolean women_only
        boolean admin_only
    }

    LEAVE_REQUESTS {
        string id PK
        string employee_id FK
        string leave_type_id FK
        date from_date
        date to_date
        int days_count
        string status
        text reason
        string manager_id FK
    }

    PERMISSION_REQUESTS {
        string id PK
        string employee_id FK
        string permission_type
        date date
        int duration_minutes
        string status
        text reason
    }

    WORK_SCHEDULES {
        bigint id PK
        string title
        string time_mode
        time check_in_time
        time check_out_time
        decimal hours_per_day
    }

    SCHEDULE_ASSIGNMENTS {
        bigint id PK
        bigint schedule_id FK
        string department_id FK
        string employee_id FK
    }

    EXAM_SCHEDULES {
        bigint id PK
        string employee_id FK
        string title
        date date
        string room_location
    }
```

---

# 5. Entity Relationships

1. **`COLLEGES` → `DEPARTMENTS` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: An academic college (e.g., Faculty of IT) contains multiple academic departments (Computer Science, Information Systems).
2. **`DEPARTMENTS` → `DEPARTMENTS` (One-to-Many Self-Referential)**
   - **Type**: 1:N (Self)
   - **Rationale**: Central administrative divisions can have child sub-administrations (e.g., General Admin parent of Academic Affairs).
3. **`COLLEGES` / `DEPARTMENTS` → `EMPLOYEES` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: Every academic employee belongs to one primary College and one primary Department. Administrative employees belong to an Administrative Department.
4. **`EMPLOYEES` ↔ `USERS` (One-to-One)**
   - **Type**: 1:1
   - **Rationale**: Every authenticated user account maps to exactly one physical employee profile.
5. **`EMPLOYEES` → `ATTENDANCE_LOGS` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: An employee accumulates one attendance record per calendar date.
6. **`EMPLOYEES` → `LEAVE_REQUESTS` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: An employee submits multiple leave requests over time; managers approve/reject requests.
7. **`LEAVE_TYPES` → `LEAVE_REQUESTS` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: Each leave request belongs to a specific regulatory leave classification (`annual`, `sick`, etc.).
8. **`EMPLOYEES` → `PERMISSION_REQUESTS` (One-to-Many)**
   - **Type**: 1:N
   - **Rationale**: An employee creates multiple permission requests throughout the working month.
9. **`WORK_SCHEDULES` ↔ `DEPARTMENTS` / `EMPLOYEES` (Many-to-Many via `SCHEDULE_ASSIGNMENTS`)**
   - **Type**: N:M
   - **Rationale**: A schedule configuration policy can be bound to multiple departments or individual staff members.

---

# 6. Backend API Specification

Below is the complete API endpoint specification grouped by functional module.

---

## Module 1: Authentication API

### 1. Endpoint: `POST /api/auth/login`
- **Purpose**: Authenticate user credentials and issue JWT bearer token.
- **Authentication**: Public
- **Authorization**: None
- **Headers**: `Content-Type: application/json`
- **Request DTO**: `LoginRequestDTO`
```json
{
  "email": "admin@aitu.edu",
  "password": "password123"
}
```
- **Response DTO**: `LoginResponseDTO` (HTTP 200)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d98f71a0-53bc-4b36...",
  "user": {
    "id": 1,
    "email": "admin@aitu.edu",
    "role": "admin",
    "employeeId": "EMP001",
    "name": "أحمد المدير",
    "nameEn": "Ahmed Admin",
    "departmentId": "CS",
    "collegeId": "FIT"
  }
}
```
- **Validation Rules**: Email mandatory & valid format; Password mandatory.
- **Error Responses**:
  - `HTTP 400 Bad Request`: Validation failure.
  - `HTTP 401 Unauthorized`: Invalid email or password (`{"error": "Wrong email or password"}`).

---

### 2. Endpoint: `POST /api/auth/logout`
- **Purpose**: Invalidate current user session / refresh token.
- **Authentication**: Bearer Token required
- **Authorization**: All Roles (`admin`, `hr`, `head`, `employee`)
- **Response DTO**: (HTTP 200) `{"message": "Logged out successfully"}`

---

## Module 2: Employee Management API

### 3. Endpoint: `GET /api/employees`
- **Purpose**: Retrieve paginated list of employees with search and multi-field filtering.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `hr`, `head`
- **Query Parameters**:
  - `search` (optional): Filter by name or email substring.
  - `type` (optional): `'academic'`, `'administrative'`, `'all'`.
  - `gender` (optional): `'male'`, `'female'`, `'all'`.
  - `departmentId` (optional): Department filter.
  - `collegeId` (optional): College filter.
  - `page` (default `1`), `limit` (default `20`).
- **Response DTO**: (HTTP 200)
```json
{
  "data": [
    {
      "id": "EMP001",
      "name": "عمرو عادل",
      "nameEn": "Amr Adel",
      "email": "amr@aitu.edu",
      "phone": "01012345678",
      "gender": "male",
      "type": "academic",
      "academicRank": "أستاذ دكتور",
      "departmentId": "CS",
      "collegeId": "FIT",
      "status": "active"
    }
  ],
  "meta": { "total": 9, "page": 1, "limit": 20 }
}
```

---

### 4. Endpoint: `POST /api/employees`
- **Purpose**: Create a new employee record.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `hr`
- **Request DTO**: `CreateEmployeeDTO`
```json
{
  "name": "محمود علي",
  "nameEn": "Mahmoud Ali",
  "email": "mahmoud@aitu.edu",
  "phone": "01011223344",
  "gender": "male",
  "role": "academic",
  "academicRank": "مدرس",
  "collegeId": "FIT",
  "departmentId": "CS"
}
```
- **Response DTO**: (HTTP 201 Created) Returns newly created `EmployeeDTO`.
- **Validation Rules**: `name`, `nameEn`, `email`, `phone` are mandatory. If `role` is `academic` or `dean`, `collegeId` and `departmentId` are required. If `role` is `administrative`, `adminDepartmentId` is required.

---

### 5. Endpoint: `PUT /api/employees/:id`
- **Purpose**: Update an existing employee profile.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `hr`
- **Request DTO**: `UpdateEmployeeDTO`

---

## Module 3: Attendance API

### 6. Endpoint: `POST /api/attendance/check-in`
- **Purpose**: Record employee check-in with GPS verification.
- **Authentication**: Bearer Token
- **Authorization**: `employee`, `hr` (Personal check-in)
- **Request DTO**: `CheckInRequestDTO`
```json
{
  "latitude": 27.184187,
  "longitude": 31.172920,
  "accuracy": 15.5
}
```
- **Validation Rules**:
  - Validates client coordinates against Campus Lat `27.184187`, Lng `31.172920`.
  - Calculates distance using Haversine formula.
  - Rejects if `distance > (500 + min(accuracy, 200))`.
  - Determines status: `present` if `checkIn <= 08:15 AM`, else `late`.
- **Response DTO**: (HTTP 200)
```json
{
  "id": "ATT_EMP003_1722176000",
  "employeeId": "EMP003",
  "date": "2026-07-28",
  "checkIn": "08:05 AM",
  "status": "present",
  "distanceMeters": 42,
  "resolutionMethod": "gps-high"
}
```
- **Error Response**: `HTTP 422 Unprocessable Entity` if outside campus bounds (`{"error": "Outside campus range. Distance: 650m — Allowed: 500m"}`).

---

### 7. Endpoint: `POST /api/attendance/check-out`
- **Purpose**: Record check-out time for current date.
- **Authentication**: Bearer Token
- **Authorization**: `employee`, `hr`
- **Response DTO**: (HTTP 200) Updates attendance record status to `left` and sets `checkOut`.

---

### 8. Endpoint: `GET /api/attendance/logs`
- **Purpose**: Query attendance logs for dashboard table, admin log, or HR log.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `hr`, `head` (filtered by dept), `employee` (own logs only)
- **Query Parameters**: `startDate`, `endDate`, `departmentId`, `status`, `search`, `page`, `limit`.

---

## Module 4: Leaves API

### 9. Endpoint: `POST /api/leaves/request`
- **Purpose**: Submit a new employee leave request.
- **Authentication**: Bearer Token
- **Authorization**: `employee`, `hr`, `admin`
- **Request DTO**: `CreateLeaveRequestDTO`
```json
{
  "type": "annual",
  "from": "2026-08-10",
  "to": "2026-08-14",
  "reason": "إجازة سنوية"
}
```
- **Validation Rules**:
  - End date must not precede start date.
  - `from` and `to` cannot be a Friday (weekend day).
  - Urgent leave must be within current week and cannot be in the past.
  - Compensatory leave must be 1 day, and employee must have worked Saturday in the same week.
  - Grant leave cannot be requested directly by employees.
  - Checks remaining leave balance (`days <= remainingBalance`).
- **Response DTO**: (HTTP 201 Created) Returns `LeaveRequestDTO`.

---

### 10. Endpoint: `POST /api/leaves/grant`
- **Purpose**: Management bulk/individual leave grant issuance by Admin.
- **Authentication**: Bearer Token
- **Authorization**: `admin`
- **Request DTO**: `GrantLeaveDTO`
```json
{
  "scope": "dept",
  "deptIds": ["CS", "IS"],
  "from": "2026-08-01",
  "to": "2026-08-01",
  "reason": "منحة بمناسبة اليوم الوطني"
}
```
- **Response DTO**: (HTTP 201 Created) `{"message": "Granted leave to 12 employees", "count": 12}`

---

### 11. Endpoint: `PUT /api/leaves/:id/status`
- **Purpose**: Approve or reject a leave request.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `head` (for department staff)
- **Request DTO**:
```json
{
  "status": "rejected",
  "rejectionNote": "حاجة العمل تلزم التواجد"
}
```

---

## Module 5: Permissions API

### 12. Endpoint: `POST /api/permissions/request`
- **Purpose**: Submit a morning/evening/exceptional/nursing permission request.
- **Authentication**: Bearer Token
- **Authorization**: `employee`, `hr`
- **Request DTO**: `CreatePermissionDTO`
```json
{
  "type": "morning",
  "date": "2026-08-05",
  "duration": 60,
  "reason": "موعد طبي"
}
```
- **Validation Rules**:
  - Rejects morning/evening permissions if requested duration exceeds remaining monthly 240-minute quota.
  - Rejects if employee has an active nursing permission locking other requests.
- **Response DTO**: (HTTP 201 Created)

---

### 13. Endpoint: `PUT /api/permissions/:id/status`
- **Purpose**: Approve or reject a permission request.
- **Authentication**: Bearer Token
- **Authorization**: `admin`, `head`

---

## Module 6: Schedules API

### 14. Endpoint: `POST /api/schedules`
- **Purpose**: Create or update work shift schedule policy.
- **Authentication**: Bearer Token
- **Authorization**: `admin`

---

## Module 7: Structure API

### 15. Endpoint: `GET /api/structure`
- **Purpose**: Retrieve full organizational hierarchy (Colleges, Academic Depts, Admin Depts).
- **Authentication**: Bearer Token
- **Authorization**: All Roles

### 16. Endpoint: `POST /api/structure/college`
- **Purpose**: Create a new college.
- **Authentication**: Bearer Token
- **Authorization**: `admin`

### 17. Endpoint: `POST /api/structure/department`
- **Purpose**: Create a new academic or admin department.
- **Authentication**: Bearer Token
- **Authorization**: `admin`

---

# 7. DTO Reference

### 1. `LoginRequestDTO`
- **Purpose**: User login payload.
- **Properties**:
  - `email` (string, required, email format)
  - `password` (string, required, min length 6)

### 2. `LoginResponseDTO`
- **Purpose**: Auth success payload.
- **Properties**:
  - `accessToken` (string, required)
  - `refreshToken` (string, required)
  - `user` (object, required: `id`, `email`, `role`, `employeeId`, `name`, `nameEn`, `departmentId`, `collegeId`)

### 3. `CreateEmployeeDTO`
- **Purpose**: Employee creation payload.
- **Properties**:
  - `name` (string, required, Arabic)
  - `nameEn` (string, required, English)
  - `email` (string, required, email format)
  - `phone` (string, required, regex phone)
  - `gender` (enum: `'male'`, `'female'`, required)
  - `role` (enum: `'academic'`, `'administrative'`, `'head_department'`, `'dean'`, required)
  - `academicRank` (string, required if `role === 'academic'`)
  - `collegeId` (string, required if `role === 'academic'` or `'dean'`)
  - `departmentId` (string, required if `role === 'academic'` or `'head_department'`)
  - `adminDepartmentId` (string, required if `role === 'administrative'`)

### 4. `CheckInRequestDTO`
- **Purpose**: Check-in geolocation payload.
- **Properties**:
  - `latitude` (number, required, -90 to 90)
  - `longitude` (number, required, -180 to 180)
  - `accuracy` (number, optional)

### 5. `CreateLeaveRequestDTO`
- **Purpose**: Leave application payload.
- **Properties**:
  - `type` (enum: `'annual'`, `'sick'`, `'urgent'`, `'compensatory'`, `'maternity'`, `'unpaid'`, required)
  - `from` (string, required, `YYYY-MM-DD`)
  - `to` (string, required, `YYYY-MM-DD`)
  - `reason` (string, required)
  - `maternityMode` (enum: `'birth'`, `'ninth'`, optional)

---

# 8. Domain Model

### 1. `LeaveRequest` State Machine
```
   ┌──────────┐      Manager Approves      ┌──────────┐
   │ PENDING  ├───────────────────────────► APPROVED │
   └────┬─────┘                            └──────────┘
        │
        │            Manager Rejects       ┌──────────┐
        └─────────────────────────────────► REJECTED │
                                           └──────────┘
```
- **Lifecycle Rules**:
  - On creation, status is `PENDING`.
  - When approved, `status` set to `APPROVED`, and employee's used leave days counter is updated.
  - When rejected, `status` set to `REJECTED`, and optional `rejectionNote` is attached.

### 2. `AttendanceLog` State Machine
```
   08:00 AM Check-in           Check-in <= 08:15 AM       ┌──────────┐
   ├──────────────────────────────────────────────────────► PRESENT  │
   │                                                      └──────────┘
   │                           Check-in > 08:15 AM        ┌──────────┐
   ├──────────────────────────────────────────────────────►   LATE   │
   │                                                      └──────────┘
   │                           Check-out Executed         ┌──────────┐
   ├──────────────────────────────────────────────────────►   LEFT   │
   │                                                      └──────────┘
   │                           End of Day No Check-in     ┌──────────┐
   └──────────────────────────────────────────────────────►  ABSENT  │
                                                          └──────────┘
```

---

# 9. Business Rules Catalog

| ID | Business Rule Description | Source File Evidence | Confidence Level & Rationale |
|----|---------------------------|----------------------|------------------------------|
| **BR-01** | **Campus GPS Geofencing**: Check-in requires latitude `27.184187`, longitude `31.172920` within 500 meters (+ accuracy margin up to 200m). | [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js#L7-L9) | **High**: Explicit constants `CAMPUS_LAT`, `CAMPUS_LNG`, `CAMPUS_RADIUS`. |
| **BR-02** | **Secure Origin Geolocation Enforcement**: Geolocation is blocked if connection is not HTTPS or localhost. | [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js#L30-L35) | **High**: Explicit `isSecureOrigin()` utility function. |
| **BR-03** | **Check-in Late Cutoff**: Arrivals after 08:15 AM are assigned `late` status; arrivals <= 08:15 AM are assigned `present` status. | [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js#L161) | **High**: Explicit code check `now.getHours()>8 \|\| (now.getHours()===8 && now.getMinutes()>15)`. |
| **BR-04** | **Leave Fiscal Year Cycle**: Leave year period starts July 1 and ends June 30 of the following year. | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js#L16-L23) | **High**: Explicit function `getLeaveYearPeriod()`. |
| **BR-05** | **Friday Weekend Rule**: Leave applications CANNOT start or end on a Friday (`getDay() === 5`). Fridays are automatically excluded from working day counts. | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js#L76,L224-L233) | **High**: Explicit checks `getDay() !== 5` in `calcWorkDays()` and Friday errors in `validateLeaveRequest()`. |
| **BR-06** | **Urgent Leave Constraints**: Urgent leave must be requested within the current week only (Sun-Sat) and cannot be requested for past dates. Max entitlement 7 days/year. | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js#L162-L179) | **High**: Explicit logic checking `weekStart`, `weekEnd`, and `today`. |
| **BR-07** | **Compensatory Leave Constraints**: Must be exactly 1 day, within the same week as a worked Saturday, max 1 per week. | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js#L181-L211) | **High**: Explicit functions `workedSaturdayInWeek()` and `hasCompensatoryInWeek()`. |
| **BR-08** | **Grant Leave Security**: Management Grant leave (`grant`) can ONLY be issued by administrators/management. | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js#L214-L220) | **High**: Explicit `grantedByAdmin` validation flag. |
| **BR-09** | **Maternity Leave Rules**: Fixed at 120 days (4 months), available exclusively to female employees (`gender === 'female'`), calculated from birth date or 9th month start. | [Employeeleaves.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Employeeleaves.js#L12,L83-L97) | **High**: Explicit `computeMaternityDates()` and `womenOnly` property. |
| **BR-10** | **Monthly Permission Quota**: Employees are allotted 240 minutes (4 hours) per month for morning/evening permissions. | [useNotifications.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/useNotifications.js#L11), [Permissions.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Permissions.js#L43) | **High**: Constant `MONTHLY_PERMS = 240` / `MONTHLY_BUDGET = 240`. |
| **BR-11** | **Exceptional Permission Rule**: Emergency permission fixed at 45 minutes duration. DOES NOT deduct from monthly 240-minute permission budget. | [Permissions.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Permissions.js#L25,L67) | **High**: Explicit filter excluding `exceptional` from `usedMins`. |
| **BR-12** | **Nursing Permission Rule**: 1 hour daily allowance for eligible female employees. DOES NOT deduct from monthly 240-minute permission budget. When active, blocks other permission requests. | [Permissions.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Permissions.js#L30-L34,L234-L246) | **High**: Explicit nursing banner and selection lock logic. |
| **BR-13** | **Department Head Scope Restriction**: Dept Heads (`head`) can ONLY view attendance logs and approve/reject requests for employees belonging to their assigned `departmentId`. | [App.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/App.js#L132-L146), [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js#L453-L458), [useNotifications.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/useNotifications.js#L200-L229) | **High**: Explicit `departmentId` filtering across pages and hooks. |

---

# 10. Authentication & Authorization

### Authentication Flow
1. Client submits email and password to `POST /api/auth/login`.
2. Backend verifies credentials against `users` table password hash.
3. On success, backend returns JWT Access Token (short-lived, e.g., 15 min) and Refresh Token (long-lived, e.g., 7 days).
4. Client stores JWT token in memory/HTTP-only cookie and includes `Authorization: Bearer <token>` header on subsequent requests.

### Role-Based Access Control (RBAC) Matrix

| Endpoint Group | Admin | HR Manager | Dept Head | Employee |
|----------------|:-----:|:----------:|:---------:|:--------:|
| `POST /api/auth/login` | Public | Public | Public | Public |
| `GET /api/employees` | ✅ | ✅ | ⚠️ (Dept Only) | ❌ |
| `POST /api/employees` | ✅ | ✅ | ❌ | ❌ |
| `POST /api/attendance/check-in` | ❌ | ✅ (Self) | ❌ | ✅ |
| `GET /api/attendance/logs` | ✅ (All) | ✅ (All) | ⚠️ (Dept Only) | ⚠️ (Own Only) |
| `POST /api/leaves/request` | ✅ | ✅ | ❌ | ✅ |
| `POST /api/leaves/grant` | ✅ | ❌ | ❌ | ❌ |
| `PUT /api/leaves/:id/status` | ✅ | ❌ | ⚠️ (Dept Only) | ❌ |
| `POST /api/permissions/request` | ❌ | ✅ (Self) | ❌ | ✅ |
| `PUT /api/permissions/:id/status` | ✅ | ❌ | ⚠️ (Dept Only) | ❌ |
| `POST /api/schedules` | ✅ | ❌ | ❌ | ❌ |
| `POST /api/structure/*` | ✅ | ❌ | ❌ | ❌ |

---

# 11. Screen → Backend Mapping

| Screen Name | Route (`activePage`) | Components | Associated APIs | Involved Tables | Required Permission |
|-------------|----------------------|------------|-----------------|-----------------|---------------------|
| **Login Page** | `null` (unauth) | `LoginPage.js` | `POST /api/auth/login` | `users`, `employees` | Public |
| **Admin Dashboard** | `dashboard` | `Dashboard.js`, `Header.js`, `Sidebar.js` | `GET /api/reports/kpi`, `GET /api/attendance/logs` | `attendance_logs`, `employees`, `departments` | `admin` |
| **Employee Dashboard**| `dashboard` | `EmployeeDashboard.js` | `GET /api/attendance/my`, `GET /api/schedules/my` | `attendance_logs`, `leave_requests`, `exam_schedules` | `employee` |
| **Dept Head Dashboard**| `dashboard` | `HeadDashboard.js` | `GET /api/attendance/logs?dept=X`, `GET /api/leaves?status=pending` | `attendance_logs`, `leave_requests`, `permission_requests` | `head` |
| **HR Dashboard** | `dashboard` | `HrDashboard.js` | `GET /api/reports/kpi`, `GET /api/employees` | `employees`, `departments`, `attendance_logs` | `hr` |
| **Employee Check-in** | `attendance` | `Attendance.js` | `POST /api/attendance/check-in`, `POST /check-out` | `attendance_logs` | `employee`, `hr` |
| **Admin Attendance Log**| `attendance` | `AttendanceAdmin.js` | `GET /api/attendance/logs`, `GET /api/reports/export` | `attendance_logs`, `employees` | `admin` |
| **HR Attendance Log** | `attendance` | `HrAttendance.js` | `GET /api/attendance/logs`, `GET /api/leaves/logs` | `attendance_logs`, `leave_requests`, `permission_requests` | `hr` |
| **Manage Employees** | `employees`, `addEmployee` | `Employees.js`, `AddEmployeeForm.jsx` | `GET /api/employees`, `POST /api/employees`, `PUT /employees/:id` | `employees`, `users`, `departments`, `colleges` | `admin`, `hr` |
| **Schedules & Grants**| `leaves` | `Leaves.js` | `POST /api/leaves/grant`, `POST /api/schedules` | `leave_requests`, `work_schedules`, `schedule_assignments` | `admin` |
| **Employee Leaves** | `leaves`, `hrLeaves` | `EmployeeLeaves.js` | `POST /api/leaves/request`, `GET /api/leaves/my` | `leave_requests`, `leave_types` | `employee`, `hr` |
| **Dept Leaves** | `headLeaves` | `HeadLeaves.js` | `GET /api/leaves?dept=X`, `PUT /leaves/:id/status` | `leave_requests`, `employees` | `head` |
| **Employee Permissions**| `permissions`, `hrPermissions` | `Permissions.js` | `POST /api/permissions/request`, `GET /permissions/my` | `permission_requests` | `employee`, `hr` |
| **Dept Permissions** | `headPermissions` | `HeadPermissions.js` | `GET /api/permissions?dept=X`, `PUT /permissions/:id/status` | `permission_requests`, `employees` | `head` |
| **Reports & Statistics**| `reports` | `Reports.js` | `GET /api/reports/attendance`, `GET /api/reports/export` | All Tables | `admin`, `hr`, `head` |
| **Organizational Structure**| `structure` | `Structure.js` | `GET /api/structure`, `POST /structure/college`, `POST /structure/department` | `colleges`, `departments` | `admin`, `hr` |

---

# 12. Routing Analysis

| State Route (`activePage`) | Rendered Page Component | Role Guard (`roles`) | APIs Called | Key Entities |
|----------------------------|-------------------------|---------------------|-------------|--------------|
| `dashboard` | `Dashboard` / `EmployeeDashboard` / `HeadDashboard` / `HRDashboard` | `['admin','head','employee','hr']` | `GET /reports/kpi`, `GET /attendance/logs` | `Attendance`, `Employee`, `Leave` |
| `attendance` | `AttendanceAdmin` (admin) / `HrAttendance` (hr) / `Attendance` (employee) | `['admin','employee','hr']` | `POST /attendance/check-in`, `GET /attendance/logs` | `Attendance` |
| `hrMyAttendance` | `Attendance` | `['hr']` | `POST /attendance/check-in` | `Attendance` |
| `hrLeaves` | `EmployeeLeaves` | `['hr']` | `POST /leaves/request` | `LeaveRequest` |
| `hrPermissions` | `Permissions` | `['hr']` | `POST /permissions/request` | `PermissionRequest` |
| `employees` | `Employees` | `['admin','head','hr']` | `GET /employees`, `PUT /employees/:id` | `Employee`, `Department` |
| `addEmployee` | `Employees` (with `showFormDefault=true`) | `['admin','hr']` | `POST /employees` | `Employee`, `User` |
| `structure` | `Structure` | `['admin','hr']` | `GET /structure`, `POST /structure/*` | `College`, `Department` |
| `leaves` | `EmployeeLeaves` (employee) / `Leaves` (admin) | `['admin','employee']` | `POST /leaves/grant`, `POST /leaves/request` | `LeaveRequest`, `Schedule` |
| `permissions` | `Permissions` | `['employee']` | `POST /permissions/request` | `PermissionRequest` |
| `headLeaves` | `HeadLeaves` | `['head']` | `GET /leaves?dept=X`, `PUT /leaves/:id/status` | `LeaveRequest` |
| `headPermissions` | `HeadPermissions` | `['head']` | `GET /permissions?dept=X`, `PUT /permissions/:id/status` | `PermissionRequest` |
| `reports` | `Reports` | `['admin','head','hr']` | `GET /reports/attendance`, `GET /reports/export` | All Entities |

---

# 13. State Management Analysis

- **Global Client State**: Elevated in root `App.js` (`lang` language locale `'ar'|'en'`, `user` authenticated user object, `activePage` current view state).
- **Server / Data Persistence Layer**: Handled via mock dataset arrays exported from `src/data.js` (`USERS`, `COLLEGES`, `DEPARTMENTS`, `EMPLOYEES`, `ATTENDANCE`, `LEAVES`, `PERMISSIONS`).
- **Firebase Firestore Integration**: Configured in `src/firebase.js` and populated via seed script `src/seedData.js` writing to Firestore collections: `colleges`, `departments`, `employees`.
- **Query & Caching Requirements**: Production backend requires a state synchronization strategy using React Query / SWR on the frontend and Redis caching on the backend for quick retrieval of employee profiles and monthly permission quotas.

---

# 14. Forms Analysis

1. **Login Form (`LoginPage.js`)**:
   - **Fields**: `email`, `password`.
   - **Validation**: Non-empty check.
   - **API**: `POST /api/auth/login`.
2. **Add/Edit Employee Form (`AddEmployeeForm.jsx`)**:
   - **Fields**: `name`, `nameEn`, `email`, `phone`, `gender`, `role`, `academicRank`, `collegeId`, `departmentId`, `adminDepartmentId`, `headType`.
   - **Validation**: Required fields based on `role` classification.
   - **API**: `POST /api/employees` or `PUT /api/employees/:id`.
3. **Leave Request Form (`Employeeleaves.js`)**:
   - **Fields**: `type`, `from`, `to`, `reason`, `maternityMode`, `birthDate`, `ninthDate`.
   - **Validation**: Friday exclusion, leave year period bounds, balance check, maternity rules.
   - **API**: `POST /api/leaves/request`.
4. **Grant Leave Form (`Leaves.js`)**:
   - **Fields**: `scope` (`'employee'|'dept'|'all'`), `collegeId`, `deptIds`, `employeeId`, `from`, `to`, `reason`.
   - **API**: `POST /api/leaves/grant`.
5. **Permission Request Form (`Permissions.js`)**:
   - **Fields**: `type`, `date`, `duration`, `reason`, `nursingType`.
   - **Validation**: 240-minute monthly budget check, active nursing lock check.
   - **API**: `POST /api/permissions/request`.
6. **Structure Form (`Structure.js`)**:
   - **Fields**: `name`, `nameEn`, `code`, `collegeId`, `parentType`, `parentId`, `function`.
   - **API**: `POST /api/structure/college` or `/department`.

---

# 15. File Upload Analysis

Currently, file uploads are not actively utilized in the frontend code. However, the production backend specification must support:
- **Employee Avatars**: `POST /api/employees/:id/avatar` (JPEG/PNG, max 2MB, S3/Cloud Storage destination).
- **Sick Leave Medical Certificates**: `POST /api/leaves/:id/document` (PDF/JPEG, max 5MB, mandatory for sick leave requests exceeding 2 days).

---

# 16. Search, Filtering & Pagination

Backend query parameter standards across all list endpoints:
- **Search**: `q` or `search` (case-insensitive substring match).
- **Filtering**: `departmentId`, `collegeId`, `status`, `gender`, `type`, `startDate`, `endDate`.
- **Sorting**: `sortBy` (field name), `sortOrder` (`ASC` | `DESC`).
- **Pagination**: `page` (integer, default `1`), `limit` (integer, default `20`, max `100`). Response body wraps list in `data` array and pagination details in `meta` object.

---

# 17. Notifications

Evaluated in real-time by the custom hook `src/pages/useNotifications.js`:

- **In-App Toast Notifications**: Triggered on successful actions (leave submission, permission approval, employee edit).
- **System Notification Triggers**:
  - `pending_leaves`: Pending leave requests for user or department.
  - `perms_low`: Permission balance remaining < 60 minutes.
  - `leave_low`: Annual leave balance remaining <= 3 days.
  - `no_checkin`: Missing check-in record for current date.
  - `consec_absent`: Employee absent 2+ consecutive days.
- **Required Backend Notification Engine**: WebSocket / SSE service pushing real-time events to connected clients, accompanied by an asynchronous background email notification worker (SMTP / AWS SES).

---

# 18. Reports & Dashboards

Key performance metrics calculated across dashboards:
1. **Attendance Rate (`pct`)**: `(Present + Left) / Total Attendance Logs * 100`.
2. **Departmental Attendance Breakdown**: Grouped counts of `present`, `late`, `absent`, and `left` per `departmentId`.
3. **Monthly Trend Bar Chart**: 6-month historical attendance percentage tracking against an 80% target benchmark.
4. **Smart Alert Summary**: Identification of consecutive unexcused absences and upcoming leave expirations.
5. **Backend Database Queries Required**:
```sql
-- Monthly Attendance Rate Query
SELECT 
    TO_CHAR(date, 'YYYY-MM') AS month_key,
    COUNT(CASE WHEN status IN ('present', 'left') THEN 1 END) * 100.0 / COUNT(*) AS attendance_pct
FROM attendance_logs
WHERE date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month_key ASC;
```

---

# 19. External Integrations

1. **Browser Geolocation API**: Interfaced via `navigator.geolocation.getCurrentPosition()`.
2. **SheetJS (XLSX)**: Client-side JavaScript library generating spreadsheet binaries (`XLSX.writeFile`).
3. **Firebase SDK**: Client-side SDK (`firebase/app`, `firebase/firestore`).
4. **Google Fonts**: Web typography integration requesting the `Cairo` font family.

---

# 20. Environment Variables

### Frontend Configuration (`.env`)
```env
REACT_APP_API_BASE_URL=https://api.attendance.aitu.edu.eg/api/v1
REACT_APP_CAMPUS_LAT=27.184187
REACT_APP_CAMPUS_LNG=31.172920
REACT_APP_CAMPUS_RADIUS_METERS=500
REACT_APP_FIREBASE_API_KEY=AIzaSyA5j5MviMSpdtfQXLu4D3JckzSUfrwUMvY
REACT_APP_FIREBASE_AUTH_DOMAIN=aitu-attendance.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=aitu-attendance
```

### Backend Configuration (`backend.env`)
```env
PORT=8080
NODE_ENV=production
DATABASE_URL=postgresql://aitu_db_user:SecurePassword123@localhost:5432/aitu_attendance
REDIS_URL=redis://localhost:6379
JWT_SECRET=super_secret_jwt_key_aitu_2026
JWT_EXPIRATION=900s
REFRESH_TOKEN_SECRET=super_secret_refresh_key_aitu_2026
REFRESH_TOKEN_EXPIRATION=604800s
SMTP_HOST=smtp.aitu.edu.eg
SMTP_PORT=587
SMTP_USER=notifications@aitu.edu.eg
SMTP_PASS=EmailPassword123
```

---

# 21. Missing Backend Components & Gap Analysis

To transition the frontend application into a full enterprise-grade production environment, the following backend components must be implemented:

1. **JWT Auth & Session Service**: Replacing local array matching in `LoginPage.js` with secure password hashing (Bcrypt/Argon2) and JWT token validation guards.
2. **Automated Cron Schedulers**:
   - **Daily Absence Scheduler**: Runs at end-of-day (e.g. 23:59) to insert `absent` logs for active employees who failed to check in.
   - **Monthly Permission Quota Reset**: Resets employee permission usage to 0 at midnight on the 1st of every calendar month.
   - **Annual Leave Accrual Worker**: Recalculates leave entitlement balances on July 1 every year.
3. **Audit Logging Service**: Recording all administrative modifications (employee creation, schedule edits, leave grants, approval decisions) in an immutable `audit_logs` table.
4. **Asynchronous Notification Dispatcher**: Email (SMTP) and SMS notifications sent when leave/permission requests are submitted, approved, or rejected.
5. **Medical Document Storage**: S3/Cloud Storage bucket integration for sick leave attachments.

---

# 22. Assumptions

| ID | Description | Evidence | Confidence Level & Rationale |
|----|-------------|----------|------------------------------|
| **ASM-01** | The university operates on a 5-day work week (Sun-Thu) with Friday and Saturday as standard weekends. | Friday explicitly excluded in `leaveValidation.js`; Saturday attendance explicitly tracked for compensatory leave. | **High** |
| **ASM-02** | Multi-tenant university deployment is not required; single institution schema for AITU is sufficient. | Institutional branding and hardcoded university titles in `Header.js` and `LoginPage.js`. | **High** |
| **ASM-03** | Standard workday hours for fixed shift employees are 08:00 AM to 04:00 PM (8 hours daily). | Default values in `Attendance.js` and `Leaves.js` schedule form (`checkIn: '08:00'`, `checkOut: '16:00'`). | **High** |
| **ASM-04** | Monthly permission quota of 240 minutes is non-transferable and does not roll over to subsequent months. | Calculated against month boundary `getPermissionsPeriod()` in `leaveValidation.js`. | **High** |

---

# 23. Traceability Matrix

| Document Section | Frontend Source Files Referenced |
|------------------|----------------------------------|
| **Executive Summary** | [App.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/App.js), [Header.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/components/Header.js), [package.json](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/package.json) |
| **Project Structure Analysis** | [src/](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src) directory listing, [package.json](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/package.json) |
| **Functional Modules** | [App.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/App.js), [Sidebar.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/components/Sidebar.js) |
| **Database Design** | [data.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/data.js), [seedData.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/seedData.js), [firebase.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/firebase.js) |
| **Entity Relationships** | [data.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/data.js), [Structure.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Structure.js), [Employees.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Employees.js) |
| **Backend API Specification** | [LoginPage.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/components/LoginPage.js), [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js), [Employeeleaves.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Employeeleaves.js), [Permissions.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Permissions.js) |
| **DTO Reference** | [AddEmployeeForm.jsx](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/AddEmployeeForm.jsx), [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js), [Employeeleaves.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Employeeleaves.js) |
| **Business Rules** | [leaveValidation.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/leaveValidation.js), [Attendance.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Attendance.js), [Employeeleaves.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Employeeleaves.js), [Permissions.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Permissions.js) |
| **Auth & Authorization** | [App.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/App.js), [LoginPage.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/components/LoginPage.js), [Sidebar.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/components/Sidebar.js) |
| **Notifications** | [useNotifications.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/useNotifications.js), [Dashboard.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Dashboard.js) |
| **Reports & Dashboards** | [Reports.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Reports.js), [Dashboard.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Dashboard.js), [HrDashboard.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/HrDashboard.js), [Headdashboard.js](file:///e:/Projects/Web/Attendance%20APP/aitu-attendance/src/pages/Headdashboard.js) |
