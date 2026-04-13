# CHMSU OSAS Binalbagan - Lost and Found Cloud System

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/chmsu-lost-and-found/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/chmsu-lost-and-found/actions/workflows/deploy.yml)

A cloud-based Lost and Found management system for Carlos Hilado Memorial State University - Office of Student Affairs and Services (Binalbagan Campus), fully compliant with **WP 06 Standards**.

![CHMSU Logo](logo.png)

## Features

### WP 06 Compliance
- **F.18** - Found Property Report
- **F.19** - Lost Property Report  
- **F.20** - Acknowledgment of Item Disposition
- **F.21** - Inventory of Valuable Items
- **F.22** - Inventory of Non-Valuable Items
- **F.23** - Inventory of Found IDs

### Core Features
- Automatic item coding (V-0001-MMYY, NV-0001-MMYY)
- Cloud database with Supabase
- Retention period tracking (6 months for valuables, 3 months for non-valuables)
- CSV backup download
- Print-ready official reports
- Profile management with Base64 image storage

## Login Credentials

```
Username: osasbinalbagan
Password: osas.123
```

## Quick Start Guide

### Step 1: Fork/Clone this Repository

```bash
git clone https://github.com/YOUR_USERNAME/chmsu-lost-and-found.git
cd chmsu-lost-and-found
```

### Step 2: Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to **Project Settings** → **API**
4. Copy your:
   - **Project URL** (e.g., `https://xxxxxxxxxxxx.supabase.co`)
   - **anon/public** key

### Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of [`supabase_schema.sql`](supabase_schema.sql)
4. Click **Run**

This creates:
- `found_items` table
- `lost_items` table
- `disposed_items` table
- `system_settings` table
- Views for reports and disposal tracking

### Step 4: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |

### Step 5: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy your site

### Step 6: Access Your Application

After deployment, your app will be available at:
```
https://YOUR_USERNAME.github.io/chmsu-lost-and-found
```

## Local Development

### Option 1: Direct File Open (Demo Mode)
Simply open `index.html` in your browser. The app will run in demo mode with sample data.

### Option 2: Local Server with Supabase

1. Create a `config.js` file in the root directory:

```javascript
const SUPABASE_CONFIG = {
    URL: 'https://your-project.supabase.co',
    ANON_KEY: 'your-anon-key'
};
```

2. Start a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

3. Open `http://localhost:8000`

## Manual Deployment (Without GitHub Actions)

If you prefer not to use GitHub Actions:

1. Update the credentials directly in `app.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

2. Push to GitHub
3. Enable GitHub Pages in Settings → Pages → Deploy from a branch → Select `main` branch

## Database Schema

### found_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_code | VARCHAR | Auto-generated (V-0001-MMYY) |
| item_name | VARCHAR | Name of the item |
| category | VARCHAR | Valuable/Non-Valuable/ID |
| date_found | DATE | Date item was found |
| location_found | VARCHAR | Where item was found |
| found_by | VARCHAR | Name of finder |
| description | TEXT | Detailed description |
| image | TEXT | Base64 encoded image |
| status | VARCHAR | Logged/Posted/Claimed/Disposed |
| claimant_name | VARCHAR | Who claimed the item |
| date_claimed | DATE | When item was claimed |

### lost_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_name | VARCHAR | Name of lost item |
| category | VARCHAR | Valuable/Non-Valuable/ID |
| date_lost | DATE | When item was lost |
| location_lost | VARCHAR | Where item was lost |
| description | TEXT | Detailed description |
| reporter_name | VARCHAR | Who reported |
| reporter_contact | VARCHAR | Contact number |
| status | VARCHAR | Pending/Matched/Closed |

### disposed_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| item_id | UUID | Reference to found_items |
| form_f20_number | VARCHAR | F.20 form number |
| disposal_date | DATE | When item was disposed |
| disposed_to | VARCHAR | CHMSU Cares/Extension |
| received_by | VARCHAR | Who received the items |

## Item Coding System (WP 06)

### Valuable Items
Format: `V-[Series]-MMYY`
- Example: `V-0001-0426` (April 2026)
- Retention: 6 months

### Non-Valuable Items
Format: `NV-[Series]-MMYY`
- Example: `NV-0001-0426` (April 2026)
- Retention: 3 months

### IDs
Format: `ID-[Series]-MMYY`
- Example: `ID-0001-0426` (April 2026)
- Action: Shred when unclaimed

## Screenshots

### Login Screen
![Login](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Found Items
![Found Items](screenshots/found-items.png)

### Inventory Report
![Inventory](screenshots/inventory.png)

## Troubleshooting

### "Supabase not configured" Warning
This means the app is running in demo mode. To connect to Supabase:
1. Check that `config.js` exists (for local) or GitHub Secrets are set (for deployment)
2. Verify your Supabase URL and key are correct
3. Refresh the page

### CORS Errors
If you see CORS errors:
1. Go to Supabase → Authentication → URL Configuration
2. Add your GitHub Pages URL to **Redirect URLs**
3. Add to **Site URL**: `https://yourusername.github.io`

### Data Not Saving
1. Check browser console for errors
2. Verify database tables exist in Supabase
3. Check RLS policies are enabled

## Security Notes

- The login credentials are client-side only (suitable for internal use)
- For production, consider adding server-side authentication
- Supabase RLS policies are configured to allow all access (suitable for internal tools)
- Images are stored as Base64 strings in the database

## Backup & Export

### Automatic CSV Backup
Click **"Download Full System Backup (CSV)"** in the Disposal section to export all data.

### Manual Database Backup
In Supabase:
1. Go to **Database** → **Backups**
2. Click **Create Backup**

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is developed for CHMSU OSAS Binalbagan. All rights reserved.

## Support

For technical support, contact:
- OSAS Binalbagan Office
- Email: osas.binalbagan@chmsu.edu.ph

## Acknowledgments

- WP 06 Work Procedure Standards
- CHMSU Administration
- OSAS Binalbagan Team

---

**Carlos Hilado Memorial State University**  
Office of Student Affairs and Services - Binalbagan Campus  
Negros Occidental, Philippines
