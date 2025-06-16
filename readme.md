# Branding Server

A centralized server for managing and delivering brand styling assets as CSS variables.

## Features

- Site and brand styling organization
- CSS variable management for colors, images, fonts, dimensions, and more
- Web UI for easy management
- API endpoints for integration with other applications
- Export to different formats (CSS, SCSS, JSON)
- Documentation generation
- Responsive variants support
- Theme support (light/dark mode)

## Installation

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/branding-server.git
cd branding-server
```

2. Create a virtual environment

```bash
python -m venv venv
```

3. Activate the virtual environment

- On Windows:
```bash
venv\Scripts\activate
```

- On macOS/Linux:
```bash
source venv/bin/activate
```

4. Install dependencies

```bash
pip install -r requirements.txt
```

5. Initialize the database

```bash
python app.py
```

## Usage

### Starting the server

```bash
uvicorn app:app --reload
```

The server will start at http://localhost:8000

### Web Interface

Open your browser and navigate to http://localhost:8000 to access the web interface.

1. Create a site
2. Add brand stylings to your site
3. Add assets (colors, images, fonts, dimensions, etc.)
4. Use the generated CSS in your projects

### API Endpoints

#### Sites

- `GET /sites/` - List all sites
- `POST /sites/` - Create a new site
- `GET /sites/{site_id}` - Get a specific site
- `PUT /sites/{site_id}` - Update a site
- `DELETE /sites/{site_id}` - Delete a site

#### Brand Stylings

- `GET /sites/{site_id}/brand-stylings/` - List all brand stylings for a site
- `POST /sites/{site_id}/brand-stylings/` - Create a new brand styling
- `GET /brand-stylings/{styling_id}` - Get a specific brand styling
- `PUT /brand-stylings/{styling_id}` - Update a brand styling
- `DELETE /brand-stylings/{styling_id}` - Delete a brand styling

#### Assets

- `GET /brand-stylings/{styling_id}/assets/` - List all assets for a brand styling
- `POST /brand-stylings/{styling_id}/assets/` - Create a new asset
- `GET /assets/{asset_id}` - Get a specific asset
- `PUT /assets/{asset_id}` - Update an asset
- `DELETE /assets/{asset_id}` - Delete an asset

#### CSS

- `GET /brand/{styling_id}/css` - Get the CSS for a brand styling

#### Export

- `GET /brand/{styling_id}/export/{format}` - Export a brand styling (formats: json, scss)

#### Documentation

- `GET /brand/{styling_id}/docs` - Generate documentation for a brand styling

## Project Structure

```
branding-server/
├── app.py              # FastAPI main application
├── config.py           # Configuration settings
├── models.py           # Database models
├── schemas.py          # Pydantic schemas for API
├── utils.py            # Utility functions
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (create from .env.example)
├── assets/             # Asset storage directory
│   ├── sites/          # Site-specific assets
│   ├── brands/         # Brand styling assets and CSS
│   └── exports/        # Export files
└── index.html          # Web UI
```

## Configuration

You can configure the application by editing the `.env` file:

```
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Database Configuration
DB_URL=sqlite:///./branding_server.db

# Asset Configuration
ASSET_DIR=assets
UPLOAD_SIZE_LIMIT=10485760  # 10MB

# Security Configuration
API_KEY_REQUIRED=False
API_KEY=development_key

# CORS Configuration
CORS_ORIGINS=*
```

## Local Backup

The application supports local backups of brand stylings. Backups are stored in `assets/exports/backups/` as JSON files.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.