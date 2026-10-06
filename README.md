# Warehouse Pallet & Stock Tracking System

A complete warehouse stock/pallet tracking web application for real warehouse operations.

## Features

- Pallet receiving and registration via barcode/QR scanning
- Storage and Direct-Out load classification
- 48-hour configurable hold period with overdue tracking
- Rack location management with QR code scanning
- Forklift put-away workflow with location validation
- QC workflow (approve/reject/hold)
- Role-based access control (Admin, Warehouse, Forklift, QC, Supervisor)
- Comprehensive audit trail and pallet history
- Supervisor dashboard with real-time metrics
- Master Locator with search and filtering
- QR code generation for rack locations
- CSV export for reports
- Local deployment with Docker Compose

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL
- **Containerization**: Docker + Docker Compose
- **Authentication**: JWT
- **Scanning**: HTML5 QR/Barcode scanner

## Installation

### Prerequisites

- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd warehouse-tracking
```

2. Create `.env` from the supplied template and set unique passwords/secrets (do not commit `.env`):
```powershell
Copy-Item .env.example .env
```
Edit `.env` and replace every `replace-with-...` value. Use a unique bootstrap admin password and a long random `SECRET_KEY`.
Set `CORS_ORIGINS` to the comma-separated browser origins that will access the API. For warehouse Wi-Fi, add `http://<server-ip>:3000` or your HTTPS frontend origin.

3. Start the application and initialize the database:
```bash
docker compose up -d --build
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Local Network Deployment

For warehouse local network deployment:

1. Find the server IP address:
```bash
# Windows
ipconfig

# Linux
ip addr show
```

2. Start the application:
```bash
docker compose up -d
```

3. Access from other devices:
```
http://<server-ip>:3000
```

The frontend detects the server address automatically and connects to the API on port 8000. Allow inbound TCP ports 3000 and 8000 through the server firewall. Camera scanning requires HTTPS on most mobile browsers; use a trusted local HTTPS reverse proxy for production scanning, or use the scanner's manual-entry fallback on plain HTTP.

PostgreSQL health is checked before backend startup. The backend applies Alembic migrations, creates the initial admin if no active admin exists, and seeds example products, racks, and pallets. The bootstrap admin credentials are read only at initialization; keep `.env` protected and change/remove the bootstrap password after setup. Further accounts should be created from `/admin`.

## Admin and Users

Set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_EMPLOYEE_ID`, and `BOOTSTRAP_ADMIN_NAME` in `.env` before the first start. There are no built-in shared demo credentials. The first admin signs in and creates named accounts from **Admin → Users**. Roles are Admin, Warehouse, Forklift, QC, and Supervisor. Passwords are hashed; users, products, and locations are deactivated rather than deleted. The last active admin cannot be deactivated or demoted.

Admin pages are protected by backend role authorization in addition to frontend route restrictions. Admin can manage catalog products, rack locations, and storage/QC targets and timezone.

## Warehouse workflows

- **Warehouse:** register pallets, classify Storage or Direct Out, scan and wrap Storage loads, and mark them ready for put-away.
- **Forklift:** scan the pallet and its preassigned rack QR; the server blocks mismatched, inactive, and occupied racks.
- **QC:** approve, hold, or reject QC-held stock. Rejections require a reason and move stock to quarantine.
- **Release:** after the configured hold target the system marks stock release-eligible but does not release it. An authorized operator scans the pallet and confirms actual release; overdue stock requires a reason.
- **Direct Out:** bypasses rack and storage hold, then requires a pallet scan and dispatch confirmation.

## Database migrations

The backend runs `alembic upgrade head` before seeding and starting. To apply manually from the backend container, run `docker compose exec backend alembic upgrade head`. Migrations create the schema, assigned-rack/occupancy constraints, and persisted operating settings. PostgreSQL is the source of truth; do not create application tables manually.

## Database Backup

Use the configured database username and name from `.env`.

### Backup (PowerShell)
```powershell
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

### Backup (Bash)
```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

### Restore (PowerShell)
```powershell
Get-Content -Raw backup.sql | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

### Restore (Bash)
```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql
```

Test restores against a separate database before relying on a backup; keep encrypted off-machine copies and protect `.env` separately.

## Mobile and network layout

On the warehouse server, allow the frontend/API ports through the local firewall. Android devices on the same Wi-Fi open `https://<warehouse-server>/` when using a trusted HTTPS reverse proxy. Most mobile browsers require a secure context to grant camera access; manual scan entry remains available without camera permission.

```text
Warehouse Wi-Fi
       |
Android phone / tablet
       |
Warehouse PC / server
  +---- Frontend
  +---- Backend
  +---- PostgreSQL
```

For local evaluation, `http://<server-ip>:3000` works, but camera permission may require HTTPS. Settings include the storage hold period (default 48 hours), QC target, and IANA timezone.

## Architecture

```
warehouse-tracking/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Security, config, database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── crud/           # Database operations
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── tests/              # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── public/
└── docker-compose.yml      # Docker orchestration
```

## Documentation

FastAPI's interactive API guide is available at `/docs`. Demo accounts are for initial evaluation only; change their passwords and the secret key before operational use.

## License

Proprietary - Internal warehouse use only.
