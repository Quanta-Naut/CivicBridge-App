
# 📄 Project Requirements Document (PRD)

## Project Name
**Civic Issues Reporting App**

## Platform
- Desktop app built with **Tauri**

## Frontend
- **React.js**

## Backend
- **Rust** (within Tauri for API logic and data handling)

## Prepared By
[Your Name]

## Date
[Insert Date]

---

## ✅ 1. Project Overview

The goal of this project is to build a lightweight, modern, and user-friendly desktop application using **Tauri**. The app will allow users to report civic issues through a structured form that captures an image, extracts GPS coordinates, categorizes the issue, records descriptions via text or voice, and submits the data to a backend API written in **Rust**. The app will also display previously raised tickets with location and details.

All ticket data **must be sent to an external API endpoint**; this is a mandatory step after the user submits the form.

---

## ✅ 2. Architecture

### Frontend – React
- UI components and navigation
- Forms, maps, and media interactions
- Handles user inputs and state
- Calls backend API via Tauri’s Rust commands

### Backend – Rust (within Tauri)
- Handles image processing (EXIF extraction)
- Maps GPS data to coordinates
- Receives and validates data from the frontend
- Manages local storage (SQLite, JSON, or other)
- Sends data to external endpoints if needed
- Ensures security and permissions handling

---

## ✅ 3. Functional Requirements

### 3.1 Raise New Ticket
- **Image Capture**
  - The user must take a picture and submit it before proceeding.
- **GPS Extraction**
  - Extract GPS coordinates from the image’s EXIF metadata via Rust and display them on the map.
- **Issue Category**
  - User selects from predefined civic issues.
- **Description**
  - User can type or record the issue.
- **Severity Selection**
  - User selects severity from four predefined options.
- **Submit**
  - After filling all fields, the user must submit the ticket.
  - **Data Submission to API (Mandatory):**
    - The complete ticket data is sent via POST request to the external API endpoint.
    - The backend handles error responses, retries, and validation.
    - Data submission must not be optional; the user is informed if the network fails or submission is incomplete.

### 3.2 Raised Tickets
- Tickets that have been successfully sent to the API will be displayed.
- Offline raised tickets must sync once the connection is restored, but pending submissions must be clearly marked until sent.

---

## ✅ 4. Technical Requirements

### 4.1 Frontend – React
- Use **Create React App** or **Vite** with TypeScript
- Use **Leaflet.js** or **Mapbox GL** for mapping
- Use **Tailwind CSS** or **Material UI** for design components
- Implement voice recording using Web APIs, or through Tauri commands if cross-platform support is needed
- Call Rust backend using Tauri’s IPC (inter-process communication) commands
- Display submission status: pending, sent, failed

### 4.2 Backend – Rust
- Use **Tauri’s command system** to expose backend functions to the frontend
- Handle:
  - Image file storage and EXIF metadata extraction
  - GPS coordinate parsing and validation
  - Local database operations (SQLite or JSON file)
  - API request forwarding
- Validate and format data before sending
- Manage local persistence and sync for offline use

### 4.3 Storage
- Store ticket data locally using SQLite (recommended) or JSON files
- Ensure data persists across app restarts
- Support offline mode with sync capability

---

## ✅ 5. Data Flow

1. User completes the form.
2. On submission, React sends data to the Rust backend.
3. Rust:
   - Validates the data.
   - Sends it to the external API endpoint.
   - Handles the API’s response.
   - Stores locally only after successful submission.
4. If submission fails, the user is notified, and the ticket is queued for retry.

---

## ✅ 6. API Contract

### API Endpoint
- **URL:** `https://api.example.com/submit-ticket`
- **Method:** POST
- **Headers:** `Content-Type: application/json`

### Payload Example

```json
{
  "image": "base64encodedimage==",
  "gps": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "category": "Garbage",
  "description": "The garbage litter is not allowing us to walk",
  "voice_note": "base64audiofile==",
  "severity": "Urgent",
  "timestamp": "2025-09-14T12:00:00Z"
}
```

### Response Example

**Success**

```json
{
  "status": "success",
  "message": "Ticket submitted successfully",
  "ticket_id": "abc123"
}
```

**Failure**

```json
{
  "status": "error",
  "message": "Invalid GPS coordinates"
}
```

---

## ✅ 7. Error Handling

- If the API endpoint is unreachable:
  - The ticket is queued locally.
  - The user is notified that submission failed but will retry.
- If the API returns an error:
  - The error message is displayed to the user.
  - The user can edit and retry submission.
- Offline mode:
  - Tickets must be stored temporarily and automatically retried when the network is restored.

---

## ✅ 8. Security Considerations

- Secure transmission using HTTPS.
- Validate inputs before submission to prevent malformed requests.
- Limit access to API via authentication (future enhancement).
- Store sensitive data like images and voice files securely and delete after successful submission if not required locally.

---

## ✅ 9. Non-Functional Requirements

- **Performance:**
  - Image processing within 2 seconds
  - UI responsiveness under 100 ms for user interactions
- **Security:**
  - Avoid exposing sensitive logic to the frontend
  - Validate all inputs at the Rust layer
- **Offline functionality:**
  - Allow users to raise tickets even when offline
  - Sync data when connection is restored

---

## ✅ 10. Development Roadmap

| Phase | Tasks | Duration |
|------|------|---------|
| Phase 1 | Setup Tauri with React and Rust | 1 week |
| Phase 2 | Implement image capture and file handling | 1 week |
| Phase 3 | Extract GPS using Rust commands | 1 week |
| Phase 4 | Map integration and coordinate display | 1 week |
| Phase 5 | Implement category, description, and severity selection | 2 weeks |
| Phase 6 | Save and retrieve tickets locally | 1 week |
| Phase 7 | Voice recording integration | 1 week |
| Phase 8 | UI polish, error handling, and testing | 2 weeks |

---

## ✅ 11. Tools & Libraries

- **Tauri** – framework for desktop app development
- **React.js** – frontend UI
- **TypeScript** – type safety
- **Tailwind CSS / Material UI** – styling
- **Leaflet.js / Mapbox GL** – maps
- **exif-rs** or similar crate – for GPS extraction
- **SQLite / sled / JSON storage** – local data persistence
- **Rust crates:** `serde`, `reqwest`, `uuid`, `chrono`, etc.

---

## ✅ 12. Future Enhancements

- Real-time sync with external servers
- User authentication and profile management
- Push notifications for ticket status updates
- Multi-language support
- Advanced filtering and analytics

---

This document provides the full specification for the civic issues reporting app, ensuring the mandatory submission of data to an external API and outlining a secure, user-friendly, and scalable approach.
