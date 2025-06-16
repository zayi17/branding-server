# app.py
from fastapi                 import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses       import FileResponse, JSONResponse
from fastapi.staticfiles     import StaticFiles
from sqlalchemy.orm          import Session, selectinload 
from typing                  import List, Optional, Dict, Any, Tuple 
from models                  import Site, BrandStyling, StyleAsset, StyleAssetVariant, Base, engine, SessionLocal, BrandLog as DBBrandLog
from utils                   import generate_css, parse_css_variables, save_local_backup # Import save_local_backup
from config                  import settings, CONTAINER_ASSET_DIR_ABS # Import settings and the absolute asset dir
from collections             import defaultdict
from sqlalchemy.orm          import selectinload

import schemas       as schemas # Import the old schemas
import os
import shutil
import json
import uuid
import re                                  # Import re for robust name formatting
import datetime                            # Import datetime for backups

import pathlib


# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME) # Use app name from settings

BACKUP_DIR = pathlib.Path("data/backup")
BACKUP_DIR.mkdir(exist_ok=True)
DB_FILE_PATH = pathlib.Path(settings.DB_URL.replace("sqlite:///", ""))

# Set up CORS - Manually split the string from settings
# Split the CORS_ORIGINS string from settings into a list
cors_origins_list = settings.CORS_ORIGINS.split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,  # Use the split list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ADD THIS SECURITY DEPENDENCY FUNCTION
async def get_api_key(x_api_key: str = Header(..., description="Your secret API key")):
    """
    Dependency function to validate the API key from the X-API-Key header.
    """
    if not settings.API_KEY_REQUIRED:
        return x_api_key

    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or Missing API Key")
    return x_api_key


# Mount static files for serving assets
# Use the absolute path from config.py for the directory
# Use the asset directory *name* from settings for the *external* URL path
os.makedirs(CONTAINER_ASSET_DIR_ABS, exist_ok=True) # Ensure the absolute asset directory exists
os.makedirs("public", exist_ok=True)


# app.mount("/scripts", StaticFiles(directory="scripts"), name="scripts")
# app.mount("/css", StaticFiles(directory="css"), name="css")
# app.mount(f"/{settings.ASSET_DIR}", StaticFiles(directory=CONTAINER_ASSET_DIR_ABS), name="static_assets")
# app.mount("/public", StaticFiles(directory="public"), name="public")
# app.mount("/scripts/codeeditor", StaticFiles(directory="codeeditor"), name="codeeditor_static")



# Helper function to generate the full asset URL
def get_asset_url(request: Request, styling_id: int, file_name: str) -> str:
    """Generates the full URL for an asset file, ensuring correct static path."""
    # Get the base URL from settings or request.base_url
    # settings.BASE_URL should be the external access URL (e.g., http://yourdomain.com:8000)
    # If settings.BASE_URL is not set, fallback to request.base_url
    base_url = settings.BASE_URL

    if not base_url:
         # Fallback to request.base_url, but we still need the schema and host/port
         # request.base_url includes schema, host, and port (e.g., http://localhost:8000/)
         base_url = str(request.base_url)
         if base_url.endswith('/'):
            base_url = base_url[:-1] # Remove trailing slash from base_url if present

    # Construct the URL path relative to the static mount point (settings.ASSET_DIR, which is 'assets')
    # The path within the static directory is brands/{styling_id}/images/{file_name}
    static_path_relative = os.path.join("brands", str(styling_id), "images", file_name)

    # Join the base URL with the static mount point URL segment (settings.ASSET_DIR) and the relative path
    # Example: http://localhost:8000 + /assets + /brands/1/images/file.jpg
    # Use the *value* of settings.ASSET_DIR ('assets') for the URL segment
    url_path = f"/{settings.ASSET_DIR}/{static_path_relative}"

    # Ensure forward slashes for URLs
    url_path = url_path.replace('\\', '/')
    # Clean up any potential double slashes in the path part, but preserve http://
    url_path = re.sub(r'(?<!:)/{2,}', '/', url_path)

    # Combine base_url and url_path
    # Handle cases where base_url might already have a trailing slash (though get_base_url tries to prevent it)
    if base_url.endswith('/'):
        full_url = f"{base_url}{url_path.lstrip('/')}" # Remove leading slash from path if base_url has trailing slash
    else:
        full_url = f"{base_url}{url_path}" # Otherwise, just concatenate


    return full_url

# Helper function to format asset name robustly
def format_asset_name(name: str) -> str:
    """Formats a raw asset name into a valid CSS variable name (--variable-name)."""
    if not name:
        return "" # Or raise an error

    raw_name = name.strip()
    if not raw_name:
        return ""

    # Remove any existing leading '--' or '-' prefixes the user might have added
    if raw_name.startswith('--'):
        raw_name = raw_name[2:]
    elif raw_name.startswith('-'):
        raw_name = raw_name[1:]

    # Replace spaces with hyphens and convert to lowercase for consistency
    formatted = raw_name.lower().replace(' ', '-')

    # Remove any characters that are not alphanumeric, hyphen, or underscore
    formatted = re.sub(r'[^\w-]+', '', formatted)

    # Ensure it starts with exactly '--'
    final_name = f"--{formatted}"

    # Handle case where name might become empty after cleaning
    if final_name == "--":
        # This should ideally not happen if name input is required and validated,
        # but as a fallback, you might generate a unique name or raise an error.
        # For now, let's assume frontend required field prevents this.
        pass

    return final_name

# Serve the frontend
# @app.get("/")
# async def read_root():
#     return FileResponse("index.html")

# @app.get("/favicon.ico")
# async def get_favicon():
#     # Assuming favicon is in the base assets directory (using absolute path)
#     favicon_path = os.path.join(CONTAINER_ASSET_DIR_ABS, "favicon.ico")
#     if not os.path.exists(favicon_path):
#          raise HTTPException(status_code=404, detail="Favicon not found")
#     return FileResponse(favicon_path, media_type="image/x-icon")

@app.post("/sites/", response_model=schemas.Site)
def create_site(site: schemas.SiteCreate, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_site = Site(**site.dict())
    db.add(db_site)
    db.commit()
    db.refresh(db_site)

    # Create directory for this site using CONTAINER_ASSET_DIR_ABS (absolute path)
    site_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "sites", str(db_site.id))
    os.makedirs(site_dir, exist_ok=True)
    
    
   
    # NEW CODE: Create a default brand styling for the site with preset dimensions
    default_styling = BrandStyling(
        name=f"{site.name if site.name else 'New Site'}",
        description="Default styling with preset dimensions",
        site_id=db_site.id
    )
    db.add(default_styling)
    db.commit()
    db.refresh(default_styling)
    
    # Create styling directory
    styling_base_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(default_styling.id))
    os.makedirs(styling_base_dir, exist_ok=True)
    os.makedirs(os.path.join(styling_base_dir, "images"), exist_ok=True)
    os.makedirs(os.path.join(styling_base_dir, "fonts"), exist_ok=True)
    
    # Add preset dimensions for mobile, tablet, and desktop
    preset_dimensions = [
        {
            "name": "--breakpoint-mobile",
            "type": "dimension",
            "value": "767px",
            "description": "Maximum width for mobile devices",
            "is_important": False,
            "group_name": "Breakpoints"
        },
        {
            "name": "--breakpoint-tablet",
            "type": "dimension",
            "value": "1023px",
            "description": "Maximum width for tablet devices",
            "is_important": False,
            "group_name": "Breakpoints"
        },
        {
            "name": "--breakpoint-desktop",
            "type": "dimension",
            "value": "1024px",
            "description": "Minimum width for desktop devices",
            "is_important": False,
            "group_name": "Breakpoints"
        }
    ]
    
    for dim in preset_dimensions:
        asset = StyleAsset(
            brand_styling_id=default_styling.id,
            name=dim["name"],
            type=dim["type"],
            value=dim["value"],
            description=dim["description"],
            is_important=dim["is_important"],
            group_name=dim["group_name"] 
        )
        db.add(asset)
    
    db.commit()
    
    # Generate initial CSS file with the preset dimensions
    generate_css(default_styling.id, db)

    return db_site

@app.get("/sites/", response_model=List[schemas.Site])
def get_sites(db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    return db.query(Site).all()

@app.get("/sites/{site_id}", response_model=schemas.Site)
def get_site(site_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if db_site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return db_site

@app.put("/sites/{site_id}", response_model=schemas.Site)
def update_site(site_id: int, site: schemas.SiteUpdate, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if db_site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    update_data = site.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_site, key, value)

    db.commit()
    db.refresh(db_site)
    return db_site

@app.delete("/sites/{site_id}")
def delete_site(site_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if db_site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    # Delete associated brand stylings first (cascade handled by database)
    # However, we still need to clean up the associated files.
    brand_stylings = db.query(BrandStyling).filter(BrandStyling.site_id == site_id).all()
    for styling in brand_stylings:
        # Delete the styling directory using CONTAINER_ASSET_DIR_ABS (absolute path)
        styling_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling.id))
        if os.path.exists(styling_dir):
            shutil.rmtree(styling_dir)

    # Delete the site directory using CONTAINER_ASSET_DIR_ABS (absolute path)
    site_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "sites", str(site_id))
    if os.path.exists(site_dir):
        shutil.rmtree(site_dir)

    db.delete(db_site)
    db.commit()
    return {"message": "Site deleted successfully"}

@app.post("/sites/{site_id}/brand-stylings/", response_model=schemas.BrandStyling)
def create_brand_styling(site_id: int, styling: schemas.BrandStylingCreate, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if db_site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    # Validate master_brand_id if provided
    if styling.master_brand_id is not None:
        master_brand = db.query(BrandStyling).filter(BrandStyling.id == styling.master_brand_id).first()
        if master_brand is None:
            raise HTTPException(status_code=404, detail="Master brand styling not found")

        # Prevent circular inheritance (a brand can't inherit from itself or from its descendants)
        if styling.master_brand_id == styling.id:
            raise HTTPException(status_code=400, detail="A brand cannot inherit from itself")

        # For updates, we would need to check if this would create a circular reference
        # But for creation, this isn't an issue since the styling doesn't exist yet

    db_styling = BrandStyling(**styling.dict(), site_id=site_id)
    db.add(db_styling)
    db.commit()
    db.refresh(db_styling)

    # Create directory for this brand styling using CONTAINER_ASSET_DIR_ABS (absolute path)
    styling_base_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(db_styling.id))
    os.makedirs(styling_base_dir, exist_ok=True)
    os.makedirs(os.path.join(styling_base_dir, "images"), exist_ok=True)
    os.makedirs(os.path.join(styling_base_dir, "fonts"), exist_ok=True)

    # Add preset dimensions for mobile, tablet, and desktop to this new styling
    preset_dimensions = [
        {
            "name": "--breakpoint-mobile",
            "type": "dimension",
            "value": "767px",
            "description": "Maximum width for mobile devices",
            "is_important": False,
            "group_name": "breakpoints"
        },
        {
            "name": "--breakpoint-tablet",
            "type": "dimension",
            "value": "1023px",
            "description": "Maximum width for tablet devices",
            "is_important": False,
            "group_name": "breakpoints"
        },
        {
            "name": "--breakpoint-desktop",
            "type": "dimension",
            "value": "1024px",
            "description": "Minimum width for desktop devices",
            "is_important": False,
            "group_name": "breakpoints"
        }
    ]

    for dim in preset_dimensions:
        # Check if asset with this name already exists (shouldn't for a brand new styling, but good practice)
        existing_asset = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == db_styling.id,
            StyleAsset.name == dim["name"]
        ).first()
        if not existing_asset:
            asset = StyleAsset(
                brand_styling_id=db_styling.id,
                name=dim["name"],
                type=dim["type"],
                value=dim["value"],
                description=dim["description"],
                is_important=dim["is_important"]
            )
            db.add(asset)

    db.commit() # Commit after adding assets

    # Generate initial CSS file with the new assets
    generate_css(db_styling.id, db)

    return db_styling

@app.get("/sites/{site_id}/brand-stylings/", response_model=List[schemas.BrandStyling])
def get_brand_stylings(site_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_site = db.query(Site).filter(Site.id == site_id).first()
    if db_site is None:
        raise HTTPException(status_code=404, detail="Site not found")

    return db.query(BrandStyling).filter(BrandStyling.site_id == site_id).all()

@app.get("/brand-stylings/{styling_id}", response_model=schemas.BrandStyling)
def get_brand_styling(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    return db_styling

@app.put("/brand-stylings/{styling_id}", response_model=schemas.BrandStyling)
def update_brand_styling(
    styling_id: int,
    styling: schemas.BrandStylingUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Validate master_brand_id if provided
    if styling.master_brand_id is not None:
        # Check if the master brand exists
        master_brand = db.query(BrandStyling).filter(BrandStyling.id == styling.master_brand_id).first()
        if master_brand is None:
            raise HTTPException(status_code=404, detail="Master brand styling not found")
        
        # Prevent circular inheritance
        if styling.master_brand_id == styling_id:
            raise HTTPException(status_code=400, detail="A brand cannot inherit from itself")
        
        # Check if the new master would create a circular inheritance chain
        # (e.g., A inherits from B, and now B wants to inherit from A)
        def check_circular_inheritance(brand_id, target_id):
            """Recursively check if setting target_id as master would create a circular reference"""
            brand = db.query(BrandStyling).filter(BrandStyling.id == brand_id).first()
            if not brand or brand.master_brand_id is None:
                return False
            if brand.master_brand_id == target_id:
                return True
            return check_circular_inheritance(brand.master_brand_id, target_id)
        
        if check_circular_inheritance(styling.master_brand_id, styling_id):
            raise HTTPException(status_code=400, detail="Circular inheritance detected")

    update_data = styling.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_styling, key, value)

    db.commit()
    db.refresh(db_styling)

    # Regenerate CSS
    generate_css(styling_id, db)

    return db_styling

@app.get("/brand-stylings/{styling_id}/available-masters", response_model=List[schemas.BrandStyling])
def get_available_master_brands(
    styling_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    """Get a list of brand stylings that can be set as master for the specified styling."""
    # Check if the styling exists
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    
    # Get all stylings from the same site
    site_stylings = db.query(BrandStyling).filter(BrandStyling.site_id == db_styling.site_id).all()
    
    # Find all sub-brands of the current styling (recursively)
    sub_brand_ids = set()
    
    def collect_sub_brands(brand_id):
        subs = db.query(BrandStyling).filter(BrandStyling.master_brand_id == brand_id).all()
        for sub in subs:
            sub_brand_ids.add(sub.id)
            collect_sub_brands(sub.id)
    
    collect_sub_brands(styling_id)
    
    # Filter out the current styling and its sub-brands
    available_masters = [
        styling for styling in site_stylings 
        if styling.id != styling_id and styling.id not in sub_brand_ids
    ]
    
    return available_masters

@app.get("/brand-stylings/{styling_id}/inheritance-chain", response_model=List[schemas.BrandStyling])
def get_inheritance_chain(
    styling_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    """Get the inheritance chain for a brand styling (current → master → master's master → etc.)"""
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    
    inheritance_chain = []
    current = db_styling
    
    # Build the chain from the current styling up to the root master
    while current:
        inheritance_chain.append(current)
        if current.master_brand_id is None:
            break
        current = db.query(BrandStyling).filter(BrandStyling.id == current.master_brand_id).first()
        # Prevent infinite loops (shouldn't happen with our validation, but just in case)
        if current and current.id in [s.id for s in inheritance_chain]:
            break
    
    return inheritance_chain

@app.post("/brand-stylings/{styling_id}/sync", response_model=dict)
async def sync_styling_from_css(
    styling_id: int,
    css_content: str = Form(...),
    parsed_data: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    # Verify styling exists
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Get existing assets
    existing_assets = db.query(StyleAsset).filter(StyleAsset.brand_styling_id == styling_id).all()
    existing_asset_map = {asset.name: asset for asset in existing_assets}
    
    added = 0
    updated = 0
    removed = 0
    processed_names = set()

    # ONLY process if parsed_data exists - no fallback to CSS parsing
    if parsed_data:
        try:
            parsed_json = json.loads(parsed_data)
            properties = parsed_json.get('properties', {})
            
            # Process each property
            for prop_name, prop_data in properties.items():
                processed_names.add(prop_name)
                
                # Just get values directly with NO processing
                asset_name = prop_name
                asset_value = prop_data.get("value", "")
                asset_type = prop_data.get("type", "other")  # Get type AS IS
                asset_group = prop_data.get("group", "General")
                asset_important = prop_data.get("isImportant", False)
                
                # Check if asset exists
                if asset_name in existing_asset_map:
                    # Update existing - NO filtering/processing
                    asset = existing_asset_map[asset_name]
                    asset.value = asset_value
                    asset.type = asset_type  # Trust frontend completely
                    asset.group_name = asset_group
                    asset.is_important = asset_important
                    updated += 1
                else:
                    # Create new - NO filtering/processing
                    new_asset = StyleAsset(
                        name=asset_name,
                        type=asset_type,  # Use EXACT type from frontend
                        value=asset_value,
                        group_name=asset_group,
                        is_important=asset_important,
                        brand_styling_id=styling_id
                    )
                    db.add(new_asset)
                    added += 1
                    
            # Remove variables that were not in the processed data
            # This handles renamed variables by deleting old ones
            for existing_name, existing_asset in existing_asset_map.items():
                if existing_name not in processed_names:
                    db.delete(existing_asset)
                    removed += 1
                    
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON data: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON data")
    
    # Save CSS file
    css_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id))
    os.makedirs(css_dir, exist_ok=True)
    css_path = os.path.join(css_dir, "style.css")
    
    try:
        with open(css_path, "w") as f:
            f.write(css_content)
    except Exception as e:
        print(f"Error saving CSS file: {e}")
    
    # Commit changes
    db.commit()
    
    return {
        "message": "CSS and database synchronized successfully",
        "added": added,
        "updated": updated,
        "removed": removed
    }

@app.get("/brand-stylings/{styling_id}/inheritance", response_model=schemas.BrandStylingInheritanceInfo)
def get_inheritance_info(
    styling_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    """Get inheritance information for a brand styling (master, sub-brands)."""
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Fetch the master brand if it exists
    master_brand = None
    if db_styling.master_brand_id:
        master_brand = db.query(BrandStyling).filter(BrandStyling.id == db_styling.master_brand_id).first()

    # Fetch stylings for which this styling is the master
    is_master_for_list = db.query(BrandStyling).filter(BrandStyling.master_brand_id == styling_id).all()

    # Return the information in the structure the frontend expects
    return {
        "has_master": db_styling.master_brand_id is not None,
        "master_brand_id": db_styling.master_brand_id,
        "master_brand": master_brand,
        "is_master_for": is_master_for_list
    }

@app.delete("/brand-stylings/{styling_id}")
def delete_brand_styling(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Delete the styling directory using CONTAINER_ASSET_DIR_ABS (absolute path)
    styling_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id))
    if os.path.exists(styling_dir):
        shutil.rmtree(styling_dir)

    db.delete(db_styling)
    db.commit()
    return {"message": "Brand styling deleted successfully"}

@app.post("/brand-stylings/{styling_id}/assets/", response_model=schemas.StyleAsset) # Or schemas.StyleAssetWithInheritance if you prefer
async def create_style_asset(
    styling_id: int,
    request: Request,
    asset_type: str = Form(...),
    name: str = Form(...),
    value: Optional[str] = Form(None),
    selector_str: Optional[str] = Form(None, alias="selector"),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    is_important: Optional[bool] = Form(False),
    group_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    db_asset_name_to_save = name 
    db_asset_value_to_save = value
    db_asset_selector_to_save = selector_str 
    final_file_path = None

    # Handle NEW "css_declaration" type
    if asset_type == "css_declaration":
        if not selector_str:
            raise HTTPException(status_code=422, detail="CSS declarations require a 'selector'.")
        if not name: 
            raise HTTPException(status_code=422, detail="CSS declarations require a property 'name'.")
        
        # Value can be an empty string for some CSS properties (e.g., border: none -> value might be "none" or empty if managed differently)
        # For now, we allow value to be None and will save it as such, or an empty string if preferred.
        # Frontend should ensure a meaningful value or empty string is sent.
        db_asset_value_to_save = value if value is not None else "" 
        
        db_asset_name_to_save = name.strip() # This is the CSS Property
        db_asset_selector_to_save = selector_str.strip()

        # Check for duplicate property within the same selector
        existing_declaration = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == styling_id,
            StyleAsset.type == "css_declaration",
            StyleAsset.selector == db_asset_selector_to_save, # Match parent selector
            StyleAsset.name == db_asset_name_to_save      # Match property name
        ).first()
        if existing_declaration:
            raise HTTPException(status_code=400, detail=f"CSS property '{db_asset_name_to_save}' already exists for selector '{db_asset_selector_to_save}'.")
        
        if not group_name: group_name = "General Rules" # Default UI group for these declarations

    # Handle OLD "class_rule" type (for potential backward compatibility or gradual migration)
    elif asset_type == "class_rule":
        if not name: raise HTTPException(status_code=422, detail="Legacy 'class_rule' needs a 'name' (which is the selector).")
        if value is None: raise HTTPException(status_code=422, detail="Legacy 'class_rule' needs a 'value' (which is the rule string).")
        db_asset_name_to_save = name.strip() # For class_rule, name IS the selector
        db_asset_value_to_save = value.strip() # And value IS the full rule string
        db_asset_selector_to_save = name.strip() # Populate .selector field with the selector name for consistency
        
        # Check for duplicate 'class_rule' (duplicate selector name for this type)
        existing_class_rule = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == styling_id,
            StyleAsset.type == "class_rule",
            StyleAsset.name == db_asset_name_to_save 
        ).first()
        if existing_class_rule:
            raise HTTPException(status_code=400, detail=f"A 'class_rule' asset for selector '{db_asset_name_to_save}' already exists.")
        if not group_name: group_name = "Legacy Class Rules"

    # Handle CSS Variables (color, image, dimension, etc.)
    else: 
        db_asset_name_to_save = format_asset_name(name) # e.g., --my-color
        if not db_asset_name_to_save:
            raise HTTPException(status_code=400, detail="Invalid asset name for CSS variable.")
        db_asset_selector_to_save = None # CSS Variables do not have a parent selector

        if asset_type == "image":
            if file:
                if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
                    raise HTTPException(status_code=400, detail=f"Invalid image file type: {file.content_type}. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}")
                file_extension = os.path.splitext(file.filename)[1]
                unique_file_name = f"{uuid.uuid4()}{file_extension}"
                relative_file_dir_in_assets = os.path.join("brands", str(styling_id), "images")
                full_file_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, relative_file_dir_in_assets)
                os.makedirs(full_file_dir, exist_ok=True)
                full_file_path_on_disk = os.path.join(full_file_dir, unique_file_name)
                try:
                    with open(full_file_path_on_disk, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
                except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to save image file: {str(e)}")
                db_asset_value_to_save = get_asset_url(request, styling_id, unique_file_name)
                final_file_path = os.path.join(relative_file_dir_in_assets, unique_file_name).replace('\\', '/')
            elif value: 
                db_asset_value_to_save = value
            else:
                raise HTTPException(status_code=422, detail="Image asset requires either a file upload or a URL value.")
        elif value is None and not file : # For other non-image, non-css_declaration variable types
            raise HTTPException(status_code=422, detail="Value is required for this asset type.")
        
        # Check for duplicate CSS variable name (where selector is None)
        existing_variable = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == styling_id,
            StyleAsset.name == db_asset_name_to_save,
            StyleAsset.selector == None 
        ).first()
        if existing_variable:
            raise HTTPException(status_code=400, detail=f"CSS Variable with name '{db_asset_name_to_save}' already exists.")

        if not group_name: # Default group_name for CSS variables
            type_groups = {"color": "Colors", "image": "Images", "font": "Typography", "dimension": "Dimensions"}
            group_name = type_groups.get(asset_type, "General Variables")

    # Create the StyleAsset record
    db_asset = StyleAsset(
        brand_styling_id=styling_id,
        name=db_asset_name_to_save,
        type=asset_type,
        value=db_asset_value_to_save,
        selector=db_asset_selector_to_save, 
        description=description,
        file_path=final_file_path,
        is_important=is_important if is_important is not None else False, # Ensure boolean
        group_name=group_name
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)

    generate_css(styling_id, db) # Regenerate CSS after adding asset
    
    # Return using the base StyleAsset schema; StyleAssetWithInheritance needs more context
    return db_asset

@app.put("/brand-stylings/{styling_id}/assets/{asset_id}", response_model=schemas.StyleAsset)
async def update_style_asset_in_styling(
    styling_id: int,
    asset_id: int,
    request: Request,
    name: Optional[str] = Form(None),
    value: Optional[str] = Form(None),
    selector_str: Optional[str] = Form(None, alias="selector"),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    is_important: Optional[bool] = Form(None),
    group_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None: 
        raise HTTPException(status_code=404, detail="Brand styling not found")

    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id, 
        StyleAsset.brand_styling_id == styling_id
    ).first()
    if db_asset is None: 
        raise HTTPException(status_code=404, detail="Style asset not found for this styling")

    updated_fields = False

    # Handle updates for "css_declaration" type
    if db_asset.type == "css_declaration":
        new_name = name.strip() if name is not None else db_asset.name
        new_selector = selector_str.strip() if selector_str is not None else db_asset.selector
        
        if name is not None and new_name != db_asset.name or \
           selector_str is not None and new_selector != db_asset.selector:
            # Check for duplicates if property name or selector context changes
            existing_declaration = db.query(StyleAsset).filter(
                StyleAsset.brand_styling_id == styling_id,
                StyleAsset.type == "css_declaration",
                StyleAsset.selector == new_selector,
                StyleAsset.name == new_name,
                StyleAsset.id != asset_id # Exclude self
            ).first()
            if existing_declaration:
                raise HTTPException(status_code=400, detail=f"CSS property '{new_name}' already exists for selector '{new_selector}'.")
        
        if name is not None and new_name != db_asset.name:
            db_asset.name = new_name # CSS Property
            updated_fields = True
        if value is not None and value.strip() != db_asset.value: # Allow empty string for value
            db_asset.value = value.strip() # CSS Value
            updated_fields = True
        if selector_str is not None and new_selector != db_asset.selector:
            db_asset.selector = new_selector # Parent selector string
            updated_fields = True
        
    # Handle updates for legacy "class_rule" type
    elif db_asset.type == "class_rule":
        if name is not None and name.strip() != db_asset.name : # Name is the selector string
            new_selector_name = name.strip()
            # Check for duplicates if selector name (which is db_asset.name here) changes
            existing_class_rule = db.query(StyleAsset).filter(
                StyleAsset.brand_styling_id == styling_id,
                StyleAsset.type == "class_rule",
                StyleAsset.name == new_selector_name,
                StyleAsset.id != asset_id # Exclude self
            ).first()
            if existing_class_rule:
                 raise HTTPException(status_code=400, detail=f"A 'class_rule' asset for selector '{new_selector_name}' already exists.")
            db_asset.name = new_selector_name
            db_asset.selector = new_selector_name # Keep .selector field in sync
            updated_fields = True
        if value is not None and value.strip() != db_asset.value: # Value is the rule string
            db_asset.value = value.strip()
            updated_fields = True

    # Handle updates for CSS Variables and other types (where db_asset.selector is None)
    else:
        if name is not None:
            formatted_new_name = format_asset_name(name)
            if not formatted_new_name: 
                raise HTTPException(status_code=400, detail="Invalid asset name provided.")
            if formatted_new_name != db_asset.name: # If name is actually changing
                # Check for duplicate CSS variable name
                existing_asset_with_new_name = db.query(StyleAsset).filter(
                    StyleAsset.brand_styling_id == styling_id,
                    StyleAsset.name == formatted_new_name,
                    StyleAsset.selector == None, # Ensure it's a global var conflict
                    StyleAsset.id != asset_id # Exclude self
                ).first()
                if existing_asset_with_new_name:
                    raise HTTPException(status_code=400, detail=f"CSS Variable with name '{formatted_new_name}' already exists.")
                db_asset.name = formatted_new_name
                updated_fields = True
        
        if db_asset.type == "image":
            if file: # If a new file is uploaded
                if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
                    raise HTTPException(status_code=400, detail=f"Invalid image file type.")
                # Delete old file if it exists
                if db_asset.file_path:
                    full_old_file_path = os.path.join(CONTAINER_ASSET_DIR_ABS, db_asset.file_path)
                    if os.path.exists(full_old_file_path): 
                        try: os.remove(full_old_file_path)
                        except OSError as e: print(f"Error deleting old file {full_old_file_path}: {e}")
                
                # Save new file
                file_extension = os.path.splitext(file.filename)[1]
                unique_file_name = f"{uuid.uuid4()}{file_extension}"
                relative_file_dir_in_assets = os.path.join("brands", str(styling_id), "images")
                full_file_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, relative_file_dir_in_assets)
                os.makedirs(full_file_dir, exist_ok=True)
                full_file_path_on_disk = os.path.join(full_file_dir, unique_file_name)
                try:
                    with open(full_file_path_on_disk, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
                except Exception as e: 
                    raise HTTPException(status_code=500, detail="Failed to save updated image file.")
                db_asset.file_path = os.path.join(relative_file_dir_in_assets, unique_file_name).replace('\\', '/')
                db_asset.value = get_asset_url(request, styling_id, unique_file_name)
                updated_fields = True
            elif value is not None and value != db_asset.value: # If image URL is updated directly
                 db_asset.value = value
                 # If it previously had a local file and is now a URL, remove the old local file
                 if db_asset.file_path:
                    full_old_file_path = os.path.join(CONTAINER_ASSET_DIR_ABS, db_asset.file_path)
                    if os.path.exists(full_old_file_path): 
                        try: os.remove(full_old_file_path)
                        except OSError as e: print(f"Error deleting old file {full_old_file_path}: {e}")
                    db_asset.file_path = None
                 updated_fields = True
        elif value is not None and value != db_asset.value: # Value for other non-image, non-css_declaration assets
            db_asset.value = value
            updated_fields = True

    # Common fields that can be updated for any asset type
    if description is not None and description != db_asset.description:
        db_asset.description = description
        updated_fields = True
    if is_important is not None and is_important != db_asset.is_important:
        db_asset.is_important = is_important
        updated_fields = True
    if group_name is not None and group_name.strip() != db_asset.group_name:
        db_asset.group_name = group_name.strip()
        updated_fields = True

    if updated_fields:
        db.commit()
        db.refresh(db_asset)
        generate_css(styling_id, db) # Regenerate CSS only if changes were made
    
    return db_asset

@app.delete("/brand-stylings/{styling_id}/assets/{asset_id}")
def delete_style_asset_from_styling(styling_id: int, asset_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    # Verify the styling exists (optional but good practice for nested resources)
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id # Ensure the asset belongs to this styling
    ).first()

    if db_asset is None:
        raise HTTPException(status_code=404, detail="Style asset not found for this styling")

    # Delete file if exists using CONTAINER_ASSET_DIR_ABS (absolute path)
    if db_asset.file_path:
        full_file_path = os.path.join(CONTAINER_ASSET_DIR_ABS, db_asset.file_path)
        if os.path.exists(full_file_path):
            os.remove(full_file_path)

    db.delete(db_asset)
    db.commit()

    # Regenerate CSS
    generate_css(styling_id, db)

    return {"message": "Style asset deleted successfully"}

@app.get("/brand-stylings/{styling_id}/assets/") # Keep your existing decorator
async def get_assets(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    # Check if the styling_id exists in the database
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Styling ID not found")

    # Return assets related to the styling WITH THEIR VARIANTS
    assets = db.query(StyleAsset).filter(StyleAsset.brand_styling_id == styling_id).all() # Consider .options(selectinload(StyleAsset.variants)) for efficiency
    
    result = []
    for asset in assets:
        # Get all variants for this asset
        # This is an N+1 query pattern; selectinload is more efficient
        variants = db.query(StyleAssetVariant).filter(
            StyleAssetVariant.asset_id == asset.id
        ).all()
        
        # Convert to dict and add variants
        asset_dict = {
            "id": asset.id,
            "name": asset.name,
            "type": asset.type,
            "value": asset.value,
            "group_name": asset.group_name,
            "description": asset.description,
            "brand_styling_id": asset.brand_styling_id,
            "file_path": asset.file_path,
            "is_important": asset.is_important,
            "selector": asset.selector, 
            "variants": [
                {
                    "id": v.id,
                    "breakpoint": v.breakpoint,
                    "value": v.value,
                    "is_important": v.is_important
                } for v in variants
            ]
        }
        result.append(asset_dict)
    
    return result

@app.get("/brand-stylings/{styling_id}/assets/{asset_id}", response_model=schemas.StyleAsset)
def get_style_asset_by_styling(styling_id: int, asset_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Get a specific asset that belongs to a styling."""
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id
    ).first()

    if db_asset is None:
        raise HTTPException(status_code=404, detail="Style asset not found")

    return db_asset

@app.get("/brand/{styling_id}/css")
def get_css(styling_id: int, db: Session = Depends(get_db)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Always regenerate CSS to ensure it includes any new variants
    generate_css(styling_id, db)

    # Use CONTAINER_ASSET_DIR_ABS for the CSS file path
    css_path = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id), "style.css")
    if not os.path.exists(css_path):
        raise HTTPException(status_code=500, detail="Failed to generate CSS file.")

    return FileResponse(css_path, media_type="text/css")

# Export endpoints
@app.get("/brand/{styling_id}/export/{format}")
def export_styling(styling_id: int, format: str, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    assets = db.query(StyleAsset).filter(StyleAsset.brand_styling_id == styling_id).all()

    # Use settings for export formats
    if format not in settings.EXPORT_FORMATS:
         raise HTTPException(status_code=400, detail=f"Export format '{format}' not supported. Supported formats: {', '.join(settings.EXPORT_FORMATS)}")

    # Use CONTAINER_ASSET_DIR_ABS (absolute path) for export directory
    export_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "exports")
    os.makedirs(export_dir, exist_ok=True) # Ensure export directory exists

    # Sanitize styling name for filename
    sanitized_name = re.sub(r'[^\w\-_\.]', '_', db_styling.name)

    if format == "json":
        # Export as JSON
        export_data = {
            "brand": {
                "id": db_styling.id,
                "name": db_styling.name,
                "site_id": db_styling.site_id
            },
            "assets": [
                {
                    "name": asset.name,
                    "type": asset.type,
                    "value": asset.value,
                    "description": asset.description
                    # file_path is internal, no need to export
                }
                for asset in assets
            ]
        }

        # Save to file using CONTAINER_ASSET_DIR_ABS (absolute path) for path
        export_path = os.path.join(export_dir, f"{sanitized_name}_export.json")
        try:
            with open(export_path, "w") as f:
                json.dump(export_data, f, indent=2)
        except Exception as e:
            print(f"Error saving JSON export for styling {styling_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate JSON export.")


        return FileResponse(export_path, media_type="application/json", filename=f"{sanitized_name}_export.json")

    elif format == "scss":
        # Export as SCSS variables
        scss_content = "// SCSS Variables for " + db_styling.name + "\n\n"

        for asset in assets:
            # Ensure variable names in SCSS start with $
            scss_name = asset.name.replace("--", "$")
            scss_content += f"{scss_name}: {asset.value};\n"

        # Save to file using CONTAINER_ASSET_DIR_ABS (absolute path) for path
        export_path = os.path.join(export_dir, f"{sanitized_name}_variables.scss")
        try:
            with open(export_path, "w") as f:
                f.write(scss_content)
        except Exception as e:
             print(f"Error saving SCSS export for styling {styling_id}: {e}")
             raise HTTPException(status_code=500, detail="Failed to generate SCSS export.")


        return FileResponse(export_path, media_type="text/plain", filename=f"{sanitized_name}_variables.scss")

    # Add other export formats here as needed (e.g., android, ios)
    # elif format == "android":
    #     pass # Implement Android export logic
    # elif format == "ios":
    #      pass # Implement iOS export logic

    else:
         # This else should technically not be reached due to the initial format check,
         # but keeping it as a fallback is fine.
        raise HTTPException(status_code=400, detail=f"Export format '{format}' not supported.")

# Documentation endpoint
# PASTE THIS CODE BLOCK INTO app.py

# REPLACE this function in app.py

def render_variants_html(asset: StyleAsset, asset_type: str) -> str:
    """Helper function to render an asset's variants as an HTML list."""
    if not asset.variants:
        return ""
    
    sorted_variants = sorted(asset.variants, key=lambda v: v.breakpoint)
    
    variants_html = '<div class="variants-info"><strong>Variants:</strong><ul>'
    for variant in sorted_variants:
        important_tag = " !important" if variant.is_important else ""
        
        # If the parent asset is a color, add a swatch for the variant
        if asset_type == 'color':
            swatch_html = f'<span class="variant-swatch" style="background-color:{variant.value};"></span>'
            variants_html += f'<li>{swatch_html}<em>{variant.breakpoint}:</em> <code>{variant.value}{important_tag}</code></li>'
        else:
            # For other types, just show the text
            variants_html += f'<li><em>{variant.breakpoint}:</em> <code>{variant.value}{important_tag}</code></li>'
            
    variants_html += '</ul></div>'
    return variants_html
# PASTE THIS HELPER FUNCTION INTO app.py

def resolve_css_var(value: str, asset_map: Dict[str, str], visited: Optional[set] = None) -> Optional[str]:
    """Recursively resolves a CSS variable (e.g., var(--my-var)) to its final value."""
    if visited is None:
        visited = set()

    # Regex to find a var() reference
    var_match = re.match(r'^\s*var\((--[a-zA-Z0-9-_]+)\)\s*$', value.strip())
    
    if not var_match:
        return value  # Not a variable or malformed, return the original value

    var_name = var_match.group(1)
    
    # Check for circular references
    if var_name in visited:
        print(f"Warning: Circular reference detected for variable {var_name}")
        return None 
    
    visited.add(var_name)
    
    next_value = asset_map.get(var_name)
    
    if next_value is None:
        print(f"Warning: Variable {var_name} not found in asset map during resolution.")
        return None

    # Recursively resolve the next value in the chain
    return resolve_css_var(next_value, asset_map, visited)

# REPLACE the existing generate_docs function in app.py with this:

@app.get("/brand/{styling_id}/docs")
def generate_docs(request: Request, styling_id: int, db: Session = Depends(get_db)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    site = db.query(Site).filter(Site.id == db_styling.site_id).first()
    if site is None:
         raise HTTPException(status_code=404, detail="Associated site not found.")

    assets = db.query(StyleAsset).options(selectinload(StyleAsset.variants)).filter(StyleAsset.brand_styling_id == styling_id).all()
    asset_map = {asset.name: asset.value for asset in assets if asset.name.startswith('--')}

    # Group assets
    colors = [a for a in assets if a.type == "color"]
    images = [a for a in assets if a.type == "image"]
    dimensions = [a for a in assets if a.type == "dimension"]
    fonts = [a for a in assets if a.type == "font"]
    selector_assets = [a for a in assets if a.type in ["css_declaration", "class_rule"]]
    grouped_selectors = defaultdict(list)
    for asset in selector_assets:
        selector_key = asset.selector if asset.type == "css_declaration" and asset.selector else asset.name
        grouped_selectors[selector_key].append(asset)
    variable_types = ["color", "image", "dimension", "font", "css_declaration", "class_rule"]
    other = [a for a in assets if a.type not in variable_types]

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{db_styling.name} - Style Guide</title>
        <link rel="stylesheet" href="/brand/{styling_id}/css">
        <style>
            body {{ font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 2rem; line-height: 1.6; background-color: #fdfdfd; color: #333; }}
            h1, h2, h3 {{ margin-top: 2.5em; border-bottom: 1px solid #eee; padding-bottom: 8px; font-weight: 600; }}
            h2 {{ font-size: 1.8em; }} h3 {{ font-size: 1.4em; border-bottom-style: dashed; }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; text-align: center; }}
            .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 25px; }}
            .item {{ border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07); background: white; transition: transform 0.2s ease-in-out; }}
            .item:hover {{ transform: translateY(-3px); }}
            .preview {{ height: 120px; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-bottom: 1px solid #eee; }}
            .preview img {{ max-width: 100%; max-height: 120px; object-fit: contain; }}
            .info {{ padding: 15px; }}
            .info p {{ margin: 5px 0; color: #666; font-size: 0.9em;}}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.07); border-radius: 8px; overflow: hidden;}}
            table th, table td {{ text-align: left; padding: 14px; border-bottom: 1px solid #f0f0f0; }}
            table tr:last-child td {{ border-bottom: none; }}
            table th {{ background-color: #f9f9f9; font-weight: 600; }}
            .asset-value code {{ background-color: #eef; color: #55d; padding: 3px 6px; border-radius: 4px; font-size: 0.95em;}}
            .variants-info {{ margin-top: 12px; padding-top: 12px; border-top: 1px dashed #ccc; }}
            .variants-info ul {{ margin: 8px 0 0 0; padding-left: 0; list-style-type: none; font-size: 0.9em; color: #555; }}
            .variants-info li {{ margin-bottom: 6px; display: flex; align-items: center; }}
            .variants-info em {{ margin-right: 5px; min-width: 70px; display: inline-block; text-align: right; }}
            .variant-swatch {{ display: inline-block; width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.15); margin-right: 8px; flex-shrink: 0; }}
            .selector-block {{ margin-bottom: 3em; }}
            code {{ font-family: 'SF Mono', 'Fira Code', 'Consolas', 'Courier New', monospace; }}
            pre > code {{ display: block; background-color: #2d2d2d; color: #f1f1f1; padding: 15px; border-radius: 4px; white-space: pre-wrap; }}
            
            /* --- STYLES FOR THE NEW PDF BUTTON --- */
            .print-button {{
                display: inline-block;
                margin: 1rem 0;
                padding: 8px 16px;
                border: 1px solid #ccc;
                border-radius: 5px;
                background-color: #f0f0f0;
                cursor: pointer;
                font-size: 0.9em;
                font-weight: 500;
            }}
            .print-button:hover {{
                background-color: #e0e0e0;
                border-color: #bbb;
            }}
            /* --- HIDE BUTTON AND OTHER UI ELEMENTS FOR PRINTING --- */
            @media print {{
                body {{ padding: 1cm; }}
                .print-button, #css-import-section {{
                    display: none !important;
                }}
                .item, table {{
                    page-break-inside: avoid;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{db_styling.name} - Style Guide</h1>
                <p>Site: {site.name}</p>
                <p>{db_styling.description or ""}</p>
                <button onclick="window.print()" class="print-button">Download as PDF</button>
            </div>
    """

    if colors:
        html += '<h2>Colors</h2><div class="grid">'
        for color in sorted(colors, key=lambda x: x.name):
            html += f"""
                    <div class="item">
                        <div class="preview" style="background-color: {color.value};"></div>
                        <div class="info">
                            <strong>{color.name}</strong><br>
                            <code>{color.value}</code>
                            <p>{color.description or ""}</p>
                            {render_variants_html(color, color.type)}
                        </div>
                    </div>"""
        html += "</div>"
    
    if images:
        html += '<h2>Images</h2><div class="grid">'
        for image in sorted(images, key=lambda x: x.name):
            resolved_value = resolve_css_var(image.value, asset_map)
            if resolved_value:
                image_src = resolved_value.strip()
                if image_src.lower().startswith('url(') and image_src.endswith(')'):
                    image_src = image_src[4:-1].strip().strip('\'"')
                
                html += f"""
                        <div class="item">
                            <div class="preview"><img src="{image_src}" alt="{image.name}"></div>
                            <div class="info">
                                <strong>{image.name}</strong><br>
                                <code>{image.value}</code>
                                <p>{image.description or ""}</p>
                                {render_variants_html(image, image.type)}
                            </div>
                        </div>"""
        html += "</div>"

    if dimensions:
        html += "<h2>Dimensions</h2><table><thead><tr><th>Name</th><th>Value</th><th>Description</th></tr></thead><tbody>"
        for dim in sorted(dimensions, key=lambda x: x.name):
            html += f"""
                    <tr>
                        <td>{dim.name}</td>
                        <td class="asset-value"><code>{dim.value}</code>{render_variants_html(dim, dim.type)}</td>
                        <td>{dim.description or ""}</td>
                    </tr>"""
        html += "</tbody></table>"

    if fonts:
        html += "<h2>Fonts</h2><table><thead><tr><th>Name</th><th>Value</th><th>Description</th></tr></thead><tbody>"
        for font in sorted(fonts, key=lambda x: x.name):
            html += f"""
                    <tr>
                        <td>{font.name}</td>
                        <td class="asset-value"><code>{font.value}</code>{render_variants_html(font, font.type)}</td>
                        <td>{font.description or ""}</td>
                    </tr>"""
        html += "</tbody></table>"
    
    if grouped_selectors:
        html += "<h2>Selectors</h2>"
        for selector, declarations in sorted(grouped_selectors.items()):
            html += f"<div class='selector-block'><h3><code>{selector}</code></h3>"
            if len(declarations) == 1 and declarations[0].type == 'class_rule':
                html += f"<pre><code>{declarations[0].value}</code></pre>"
            else:
                html += "<table><thead><tr><th>Property</th><th>Value</th><th>Description</th></tr></thead><tbody>"
                for decl in sorted(declarations, key=lambda d: d.name):
                    html += f"""
                        <tr>
                            <td>{decl.name}</td>
                            <td class="asset-value"><code>{decl.value}</code>{render_variants_html(decl, decl.type)}</td>
                            <td>{decl.description or ""}</td>
                        </tr>"""
                html += "</tbody></table>"
            html += "</div>"
    
    if other:
        html += "<h2>Other Variables</h2><table><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Description</th></tr></thead><tbody>"
        for var in sorted(other, key=lambda x: x.name):
            html += f"""
                    <tr>
                        <td>{var.name}</td>
                        <td>{var.type}</td>
                        <td class="asset-value"><code>{var.value}</code>{render_variants_html(var, var.type)}</td>
                        <td>{var.description or ""}</td>
                    </tr>"""
        html += "</tbody></table>"

    full_css_url = f"{str(request.base_url).rstrip('/')}/brand/{styling_id}/css"
    html += f"""
            <div id="css-import-section">
                <h2>CSS Import</h2>
                <p>Use the following snippet to include these styles in your project:</p>
                <pre><code id="css-import-code">@import url('{full_css_url}');</code></pre>
                <p>Or via a link tag:</p>
                <pre><code id="css-link-code">&lt;link rel="stylesheet" href="{full_css_url}"&gt;</code></pre>
            </div>
        </div>
    </body>
    </html>
    """

    docs_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id))
    os.makedirs(docs_dir, exist_ok=True)
    docs_path = os.path.join(docs_dir, "docs.html")

    try:
        with open(docs_path, "w", encoding="utf-8") as f:
            f.write(html)
    except Exception as e:
         print(f"Error saving documentation file for styling {styling_id}: {e}")
         raise HTTPException(status_code=500, detail="Failed to generate documentation file.")

    return FileResponse(docs_path, media_type="text/html")


@app.post("/brand/{styling_id}/update-css")
async def update_css(styling_id: int, css_content: str = Form(...), db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """
    Update the CSS file for a brand styling.
    This endpoint allows direct editing of the CSS file through the UI.
    Note: This only updates the file, not the database assets.
    Use the /sync endpoint for bidirectional sync.
    """
    # Verify that the styling exists
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    # Create the directory if it doesn't exist using CONTAINER_ASSET_DIR_ABS (absolute path)
    css_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id))
    os.makedirs(css_dir, exist_ok=True)

    # Save the CSS content to the file using CONTAINER_ASSET_DIR_ABS (absolute path)
    css_path = os.path.join(css_dir, "style.css")

    try:
        with open(css_path, "w") as f:
            f.write(css_content)

        return {"message": "CSS updated successfully (Note: Database assets are not synchronized with this endpoint. Use /sync for full bidirectional sync.)"}
    except Exception as e:
        print(f"Error saving CSS file via update-css endpoint for styling {styling_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update CSS file: {str(e)}")

@app.get("/brand-stylings/{styling_id}/inheritance")
def get_brand_styling_inheritance(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Get inheritance information for a brand styling."""
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    
    # Get inheritance info
    has_master = db_styling.master_brand_id is not None
    inheritance_info = {
        "has_master": has_master,
        "master_brand_id": db_styling.master_brand_id,
        "master_brand": None,
        "is_master_for": []
    }
    
    # If this styling has a master, get master's details
    if has_master:
        master_brand = db.query(BrandStyling).filter(
            BrandStyling.id == db_styling.master_brand_id
        ).first()
        
        if master_brand:
            inheritance_info["master_brand"] = {
                "id": master_brand.id,
                "name": master_brand.name,
                "site_id": master_brand.site_id
            }
    
    # Find any stylings that use this one as their master
    sub_brands = db.query(BrandStyling).filter(
        BrandStyling.master_brand_id == styling_id
    ).all()
    
    # Add list of sub-brands
    inheritance_info["is_master_for"] = [
        {
            "id": sub.id,
            "name": sub.name,
            "site_id": sub.site_id
        }
        for sub in sub_brands
    ]
    
    # Count of inherited and overridden assets
    if has_master:
        # Get local assets
        local_assets = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == styling_id
        ).all()
        local_asset_names = {asset.name for asset in local_assets}
        
        # Get master assets
        master_assets = db.query(StyleAsset).filter(
            StyleAsset.brand_styling_id == db_styling.master_brand_id
        ).all()
        
        # Count inheritance stats
        inherited_count = 0
        overridden_count = 0
        
        for asset in master_assets:
            if asset.name in local_asset_names:
                overridden_count += 1
            else:
                inherited_count += 1
        
        inheritance_info["stats"] = {
            "local_assets": len(local_assets),
            "inherited_assets": inherited_count,
            "overridden_assets": overridden_count,
            "total_assets": len(local_assets) + inherited_count
        }
    
    return inheritance_info

@app.get("/brand-stylings/{styling_id}/assets-with-inheritance", response_model=List[schemas.StyleAssetWithInheritance])
async def get_assets_with_inheritance(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    print(f"\n[BACKEND DEBUG] get_assets_with_inheritance called for styling_id: {styling_id}")
    current_viewed_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if not current_viewed_styling:
        print(f"[BACKEND DEBUG] Styling ID {styling_id} not found in DB.")
        raise HTTPException(status_code=404, detail="Styling ID not found")
    print(f"[BACKEND DEBUG] Current Viewed Styling: ID={current_viewed_styling.id}, Name='{current_viewed_styling.name}', MasterID={current_viewed_styling.master_brand_id}")

    # Step 1: Determine the stylings to include in the analysis and their specificity order.
    stylings_for_analysis_with_spec: List[Tuple[BrandStyling, int]] = []
    ancestor_chain: List[BrandStyling] = []
    temp_ancestor_traversal = current_viewed_styling
    processed_ancestor_ids = {current_viewed_styling.id}
    
    print("[BACKEND DEBUG] Building ancestor chain...")
    while temp_ancestor_traversal and temp_ancestor_traversal.master_brand_id is not None:
        if temp_ancestor_traversal.master_brand_id in processed_ancestor_ids:
            print(f"[BACKEND DEBUG] WARNING: Circular dependency detected fetching ancestors for {current_viewed_styling.id}. Current link: {temp_ancestor_traversal.master_brand_id}")
            break
        parent_styling = db.query(BrandStyling).filter(BrandStyling.id == temp_ancestor_traversal.master_brand_id).first()
        if not parent_styling:
            print(f"[BACKEND DEBUG] Parent styling with ID {temp_ancestor_traversal.master_brand_id} not found.")
            break
        ancestor_chain.append(parent_styling)
        processed_ancestor_ids.add(parent_styling.id)
        temp_ancestor_traversal = parent_styling
    ancestor_chain.reverse()

    for i, ancestor in enumerate(ancestor_chain):
        stylings_for_analysis_with_spec.append((ancestor, i))
        print(f"[BACKEND DEBUG] Added Ancestor: ID={ancestor.id}, Name='{ancestor.name}', SpecIndex={i}")
    
    current_specificity_index = len(ancestor_chain)
    stylings_for_analysis_with_spec.append((current_viewed_styling, current_specificity_index))
    print(f"[BACKEND DEBUG] Added Current: ID={current_viewed_styling.id}, Name='{current_viewed_styling.name}', SpecIndex={current_specificity_index}")

    descendant_stylings_to_add: List[Tuple[BrandStyling, int]] = []
    queue: List[Tuple[BrandStyling, int]] = [(current_viewed_styling, current_specificity_index)]
    visited_for_descendants = set(processed_ancestor_ids)
    head = 0
    print("[BACKEND DEBUG] Building descendant list...")
    while head < len(queue):
        parent_for_desc, parent_spec_idx = queue[head]
        head += 1
        if parent_for_desc is None or parent_for_desc.id is None: continue
        children = db.query(BrandStyling).filter(BrandStyling.master_brand_id == parent_for_desc.id).all()
        for child in children:
            if child.id not in visited_for_descendants:
                child_spec_idx = parent_spec_idx + 1 
                descendant_stylings_to_add.append((child, child_spec_idx))
                visited_for_descendants.add(child.id)
                queue.append((child, child_spec_idx))
                print(f"[BACKEND DEBUG] Added Descendant: ID={child.id}, Name='{child.name}', SpecIndex={child_spec_idx} (Parent ID: {parent_for_desc.id})")
    
    descendant_stylings_to_add.sort(key=lambda x: (x[1], x[0].id))
    stylings_for_analysis_with_spec.extend(descendant_stylings_to_add)
    print(f"[BACKEND DEBUG] Total stylings for analysis (count: {len(stylings_for_analysis_with_spec)})")

    # Step 2 & 3: Collect all assets, grouping them by a unique key.
    all_scoped_assets_by_key: Dict[str, List[Tuple[StyleAsset, int]]] = {}
    print("[BACKEND DEBUG] Collecting assets from analysis scope...")
    for styling_in_scope, spec_idx in stylings_for_analysis_with_spec:
        if styling_in_scope is None or styling_in_scope.id is None: continue
        assets_in_styling = db.query(StyleAsset).options(selectinload(StyleAsset.variants)).filter(StyleAsset.brand_styling_id == styling_in_scope.id).all()
        print(f"[BACKEND DEBUG] Styling ID {styling_in_scope.id} ('{styling_in_scope.name}'): Found {len(assets_in_styling)} physical assets.")
        for asset_model in assets_in_styling:
            if not (asset_model and asset_model.name and asset_model.type and asset_model.value is not None): 
                print(f"[BACKEND DEBUG] SKIPPING asset from Styling ID {styling_in_scope.id} due to None value or missing essential field: Name='{asset_model.name if asset_model else 'N/A'}'")
                continue
            
            # --- MODIFICATION START ---
            # Create a unique key to correctly identify conflicts.
            asset_key = ""
            if asset_model.type == "css_declaration" and asset_model.selector:
                # For declarations, the key is a combination of its selector and property name.
                asset_key = f"decl::{asset_model.selector}::{asset_model.name}"
            elif asset_model.type != "css_declaration" and not asset_model.selector:
                # For global CSS variables, the key is just the variable name.
                asset_key = f"var::{asset_model.name}"
            else:
                # Fallback for legacy or other types.
                asset_key = f"other::{asset_model.name}"

            if asset_key not in all_scoped_assets_by_key:
                all_scoped_assets_by_key[asset_key] = []
            all_scoped_assets_by_key[asset_key].append((asset_model, spec_idx))
            # --- MODIFICATION END ---

    print(f"[BACKEND DEBUG] all_scoped_assets_by_key populated. Number of unique asset keys found: {len(all_scoped_assets_by_key)}")

    # Step 4: Determine the "winner" ORM model for each unique key.
    winning_assets_orm_map: Dict[str, StyleAsset] = {}
    print("[BACKEND DEBUG] Determining winning assets...")
    for asset_key, declarations_with_spec in all_scoped_assets_by_key.items():
        if not declarations_with_spec: continue
        declarations_with_spec.sort(key=lambda x: x[1]) 
        important_declarations = [d for d in declarations_with_spec if d[0].is_important]
        winner_model: Optional[StyleAsset] = None
        if important_declarations:
            winner_model = important_declarations[-1][0]
        elif declarations_with_spec:
            winner_model = declarations_with_spec[-1][0]
        if winner_model:
            winning_assets_orm_map[asset_key] = winner_model
    print(f"[BACKEND DEBUG] winning_assets_orm_map populated. Number of winning assets: {len(winning_assets_orm_map)}")

    # Step 5: Construct the result list.
    result_assets: List[Dict[str, Any]] = []
    processed_asset_keys_in_current_styling = set()

    # Part 5.1: Process assets physically present in the current_viewed_styling
    assets_physically_in_viewed_styling = db.query(StyleAsset).options(selectinload(StyleAsset.variants)).filter(StyleAsset.brand_styling_id == styling_id).all()
    print(f"[BACKEND DEBUG] Part 5.1: Processing {len(assets_physically_in_viewed_styling)} assets physically in styling ID {styling_id}")

    for physical_asset_in_current_styling in assets_physically_in_viewed_styling:
        if not (physical_asset_in_current_styling and physical_asset_in_current_styling.name):
            print(f"[BACKEND DEBUG] SKIPPING a physical asset due to missing name or object.")
            continue
        
        # --- MODIFICATION START ---
        # Generate the same unique key for the physical asset to perform lookups.
        asset_key = ""
        if physical_asset_in_current_styling.type == "css_declaration" and physical_asset_in_current_styling.selector:
            asset_key = f"decl::{physical_asset_in_current_styling.selector}::{physical_asset_in_current_styling.name}"
        elif physical_asset_in_current_styling.type != "css_declaration" and not physical_asset_in_current_styling.selector:
            asset_key = f"var::{physical_asset_in_current_styling.name}"
        else:
            asset_key = f"other::{physical_asset_in_current_styling.name}"
        
        processed_asset_keys_in_current_styling.add(asset_key)
        # --- MODIFICATION END ---
        
        asset_dict: Dict[str, Any] = {
           "id": physical_asset_in_current_styling.id,
            "name": physical_asset_in_current_styling.name,
            "type": physical_asset_in_current_styling.type,
            "value": physical_asset_in_current_styling.value,
            "description": physical_asset_in_current_styling.description,
            "brand_styling_id": physical_asset_in_current_styling.brand_styling_id,
            "file_path": physical_asset_in_current_styling.file_path,
            "is_important": physical_asset_in_current_styling.is_important,
            "group_name": physical_asset_in_current_styling.group_name,
            "selector": physical_asset_in_current_styling.selector,
            "variants": [{"id": v.id, "breakpoint": v.breakpoint, "value": v.value, "is_important": v.is_important} for v in (physical_asset_in_current_styling.variants or [])],
            "source": "local",
            "overridden": False, 
            "master_asset_id": None,
            "master_is_important": None,
        }

        winner_orm_for_this_key = winning_assets_orm_map.get(asset_key)

        if not winner_orm_for_this_key:
            print(f"[BACKEND DEBUG] WARNING: No winner_orm found for physically present local asset with key '{asset_key}' (ID {physical_asset_in_current_styling.id}). Treating as non-conflicting local.")
            result_assets.append(asset_dict)
            continue

        is_physical_local_the_actual_winner = (winner_orm_for_this_key.id == physical_asset_in_current_styling.id)

        if not is_physical_local_the_actual_winner:
            asset_dict["overridden"] = True
            asset_dict["master_asset_id"] = winner_orm_for_this_key.id
            asset_dict["master_is_important"] = winner_orm_for_this_key.is_important
            print(f"[BACKEND DEBUG] Local asset with key '{asset_key}' (ID {physical_asset_in_current_styling.id}) is overridden by asset ID {winner_orm_for_this_key.id} from brand {winner_orm_for_this_key.brand_styling_id}")
        else:
            asset_dict["overridden"] = False
            other_declarations_with_spec = [
                d_tuple for d_tuple in all_scoped_assets_by_key.get(asset_key, []) 
                if d_tuple[0].id != physical_asset_in_current_styling.id
            ]
            most_specific_beaten_asset_orm = None
            if other_declarations_with_spec:
                other_declarations_with_spec.sort(key=lambda x_tuple: x_tuple[1])
                important_other = [d_tuple for d_tuple in other_declarations_with_spec if d_tuple[0].is_important]
                if important_other:
                    most_specific_beaten_asset_orm = important_other[-1][0]
                elif other_declarations_with_spec:
                    most_specific_beaten_asset_orm = other_declarations_with_spec[-1][0]
            
            if most_specific_beaten_asset_orm:
                asset_dict["master_asset_id"] = most_specific_beaten_asset_orm.id
                asset_dict["master_is_important"] = most_specific_beaten_asset_orm.is_important
                print(f"[BACKEND DEBUG] Local asset with key '{asset_key}' (ID {physical_asset_in_current_styling.id}, WINNER) overrides asset ID {most_specific_beaten_asset_orm.id} from brand {most_specific_beaten_asset_orm.brand_styling_id}")
            else:
                 print(f"[BACKEND DEBUG] Local asset with key '{asset_key}' (ID {physical_asset_in_current_styling.id}, WINNER) has no specific asset it overrides.")
        result_assets.append(asset_dict)

    # Part 5.2: Process purely inherited assets (winners not physically in current_viewed_styling)
    print(f"[BACKEND DEBUG] Part 5.2: Processing purely inherited assets from {len(winning_assets_orm_map)} total winning assets.")
    for asset_key, winner_orm in winning_assets_orm_map.items():
        if asset_key in processed_asset_keys_in_current_styling:
            continue 

        if not (winner_orm and winner_orm.name and winner_orm.type and winner_orm.value is not None and \
                winner_orm.id is not None and winner_orm.brand_styling_id is not None):
            print(f"[BACKEND DEBUG] SKIPPING inherited winner_orm for key '{asset_key}' due to missing essential fields.")
            continue
            
        asset_dict: Dict[str, Any] = {
            "id": winner_orm.id,
            "name": winner_orm.name,
            "type": winner_orm.type,
            "value": winner_orm.value,
            "description": winner_orm.description,
            "brand_styling_id": winner_orm.brand_styling_id,
            "file_path": winner_orm.file_path,
            "is_important": winner_orm.is_important,
            "group_name": winner_orm.group_name,
            "selector": winner_orm.selector,
            "variants": [{"id": v.id, "breakpoint": v.breakpoint, "value": v.value, "is_important": v.is_important} for v in (winner_orm.variants or [])],
            "source": "inherited",
            "overridden": False, 
            "master_asset_id": None, 
            "master_is_important": None,
        }
        print(f"[BACKEND DEBUG] Asset with key '{asset_key}' is purely inherited. Winning definition from asset ID {winner_orm.id} in brand {winner_orm.brand_styling_id}")
        result_assets.append(asset_dict)
    
    result_assets.sort(key=lambda x: (x.get('group_name', 'ZZZ').lower(), x.get('name', '').lower()))
    print(f"[BACKEND DEBUG] FINAL result_assets (count: {len(result_assets)}). Returning to frontend.")
    return result_assets

@app.get("/brand-stylings/{styling_id}/compare-asset/{asset_name}")
async def compare_asset_with_master(styling_id: int, asset_name: str, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Compare a local asset with its master brand version if it exists."""
    # Format the asset name consistently
    formatted_asset_name = format_asset_name(asset_name)
    
    # Check if the styling exists
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    
    # Check if this styling has a master brand
    if db_styling.master_brand_id is None:
        raise HTTPException(status_code=400, detail="This styling doesn't have a master brand")
    
    # Get the local asset (if it exists)
    local_asset = db.query(StyleAsset).filter(
        StyleAsset.brand_styling_id == styling_id,
        StyleAsset.name == formatted_asset_name
    ).first()
    
    # Get the master asset
    master_asset = db.query(StyleAsset).filter(
        StyleAsset.brand_styling_id == db_styling.master_brand_id,
        StyleAsset.name == formatted_asset_name
    ).first()
    
    if not master_asset:
        raise HTTPException(status_code=404, detail="Asset not found in master brand")
    
    # Compare and return the results
    return {
        "name": formatted_asset_name,
        "master_asset": {
            "id": master_asset.id,
            "type": master_asset.type,
            "value": master_asset.value,
            "description": master_asset.description,
            "is_important": master_asset.is_important
        },
        "local_asset": None if not local_asset else {
            "id": local_asset.id,
            "type": local_asset.type,
            "value": local_asset.value,
            "description": local_asset.description,
            "is_important": local_asset.is_important
        },
        "is_overridden": local_asset is not None,
        "differences": [] if not local_asset else [
            prop for prop in ["type", "value", "description", "is_important"]
            if getattr(local_asset, prop) != getattr(master_asset, prop)
        ]
    }

@app.get("/master-brands/", response_model=List[schemas.BrandStyling])
def get_master_brands(exclude: Optional[int] = None, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Get all brand stylings that can be used as master brands."""
    query = db.query(BrandStyling)
    
    # Exclude the specified styling ID if provided
    if exclude is not None:
        query = query.filter(BrandStyling.id != exclude)
        
    # Also exclude any stylings that have this styling as their master
    # to prevent circular inheritance
    if exclude is not None:
        sub_brands_query = db.query(BrandStyling.id).filter(BrandStyling.master_brand_id == exclude)
        query = query.filter(~BrandStyling.id.in_(sub_brands_query))
    
    return query.all()

@app.post("/brand-stylings/{styling_id}/assets/{asset_id}/variants/", response_model=schemas.StyleAssetVariant)
async def create_asset_variant(
    styling_id: int,
    asset_id: int,
    variant: schemas.StyleAssetVariantCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    # Verify the asset exists and belongs to the styling
    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id
    ).first()
    
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found for this styling")
    
    # Check if variant for this breakpoint already exists
    existing_variant = db.query(StyleAssetVariant).filter(
        StyleAssetVariant.asset_id == asset_id,
        StyleAssetVariant.breakpoint == variant.breakpoint
    ).first()
    
    if existing_variant:
        raise HTTPException(status_code=400, detail=f"Variant for breakpoint '{variant.breakpoint}' already exists")
    
    # Create the variant
    db_variant = StyleAssetVariant(
        asset_id=asset_id,
        breakpoint=variant.breakpoint,
        value=variant.value,
        is_important=variant.is_important
    )
    
    db.add(db_variant)
    db.commit()
    db.refresh(db_variant)
    
    # Regenerate CSS
    generate_css(styling_id, db)
    
    return db_variant

@app.get("/brand-stylings/{styling_id}/assets/{asset_id}/variants/", response_model=List[schemas.StyleAssetVariant])
async def get_asset_variants(
    styling_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    # Verify the asset exists and belongs to the styling
    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id
    ).first()
    
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found for this styling")
    
    # Get all variants for this asset
    variants = db.query(StyleAssetVariant).filter(
        StyleAssetVariant.asset_id == asset_id
    ).all()
    
    return variants

@app.put("/brand-stylings/{styling_id}/assets/{asset_id}/variants/{variant_id}", response_model=schemas.StyleAssetVariant)
async def update_asset_variant(
    styling_id: int,
    asset_id: int,
    variant_id: int,
    variant: schemas.StyleAssetVariantUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    # Verify the asset exists and belongs to the styling
    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id
    ).first()
    
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found for this styling")
    
    # Get the variant
    db_variant = db.query(StyleAssetVariant).filter(
        StyleAssetVariant.id == variant_id,
        StyleAssetVariant.asset_id == asset_id
    ).first()
    
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found for this asset")
    
    # Update the variant
    update_data = variant.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_variant, key, value)
    
    db.commit()
    db.refresh(db_variant)
    
    # Regenerate CSS
    generate_css(styling_id, db)
    
    return db_variant

@app.delete("/brand-stylings/{styling_id}/assets/{asset_id}/variants/{variant_id}")
async def delete_asset_variant(
    styling_id: int,
    asset_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    # Verify the asset exists and belongs to the styling
    db_asset = db.query(StyleAsset).filter(
        StyleAsset.id == asset_id,
        StyleAsset.brand_styling_id == styling_id
    ).first()
    
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found for this styling")
    
    # Get the variant
    db_variant = db.query(StyleAssetVariant).filter(
        StyleAssetVariant.id == variant_id,
        StyleAssetVariant.asset_id == asset_id
    ).first()
    
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found for this asset")
    
    # Delete the variant
    db.delete(db_variant)
    db.commit()
    
    # Regenerate CSS
    generate_css(styling_id, db)
    
    return {"message": "Variant deleted successfully"}

@app.get("/brand-stylings/{styling_id}/preview-css")
def preview_css(styling_id: int, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")
    
    generate_css(styling_id, db)
    css_path = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id), "style.css")
    
    with open(css_path, "r") as f:
        css_content = f.read()
    
    return {"css": css_content}

#log endpoint 
@app.post("/brand-stylings/{styling_id}/logs/", response_model=schemas.BrandLog) # Use BrandLogResponse
def create_brand_log_entry(
    styling_id: int,
    log_data: schemas.BrandLogCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(get_api_key)
):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    db_log = DBBrandLog( # Use aliased DB model name
        brand_styling_id=styling_id,
        type=log_data.type,
        ref=log_data.ref,
        message=log_data.message
        # timestamp is defaulted by the model
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@app.get("/brand-stylings/{styling_id}/logs/", response_model=List[schemas.BrandLog]) # Use BrandLogResponse
def get_brand_log_entries( # Renamed to avoid conflict
    styling_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50, # Default to fetching latest 50 logs
    api_key: str = Depends(get_api_key)
):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if db_styling is None:
        raise HTTPException(status_code=404, detail="Brand styling not found")

    logs = db.query(DBBrandLog)\
             .filter(DBBrandLog.brand_styling_id == styling_id)\
             .order_by(DBBrandLog.timestamp.desc())\
             .offset(skip)\
             .limit(limit)\
             .all()
    return logs

#BACKUP SYSTEM
def _backup_current_db(db: Session) -> str:
    """Helper function to back up the current database file."""
    db.close() # Close the connection to allow file access
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"backup_{DB_FILE_PATH.stem}_{timestamp}.db"
    backup_path = BACKUP_DIR / backup_filename
    
    try:
        shutil.copy(DB_FILE_PATH, backup_path)
        return str(backup_path)
    except Exception as e:
        print(f"Error during manual backup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {e}")
    finally:
        # Re-establish DB connection for subsequent operations if needed,
        # although FastAPI's dependency injection will handle this for new requests.
        pass

def is_safe_path(basedir, path, follow_symlinks=True):
    """Check if the path is safe and within the basedir."""
    if follow_symlinks:
        return os.path.realpath(path).startswith(os.path.realpath(basedir))
    return os.path.abspath(path).startswith(os.path.abspath(basedir))

# === SYSTEM & BACKUP ENDPOINTS ===
@app.get("/system/db-info")
def get_db_info(db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Gets metadata about the current database."""
    if not DB_FILE_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found.")
        
    record_counts = {
        "sites": db.query(Site).count(),
        "brand_stylings": db.query(BrandStyling).count(),
        "style_assets": db.query(StyleAsset).count(),
    }
    
    return {
        "path": str(DB_FILE_PATH),
        "modified_time": DB_FILE_PATH.stat().st_mtime,
        "record_counts": record_counts
    }

@app.get("/system/backups")
def get_backup_list(api_key: str = Depends(get_api_key)):
    """Lists all available backup files."""
    backups = []
    for f in sorted(BACKUP_DIR.iterdir(), key=os.path.getmtime, reverse=True):
        if f.is_file() and f.suffix == '.db':
            backups.append({
                "filename": f.name,
                "modified_time": f.stat().st_mtime,
                "size": f.stat().st_size
            })
    return backups

@app.post("/system/backup")
def backup_database(db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Creates a new backup of the current database."""
    backup_path = _backup_current_db(db)
    return {"message": f"Backup created successfully at {backup_path}"}

@app.post("/system/restore/{filename}")
def restore_database(filename: str, db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Restores the database from a selected backup file."""
    backup_file = BACKUP_DIR / filename
    
    # Security: Ensure the file is within the backup directory
    if not is_safe_path(BACKUP_DIR, backup_file):
        raise HTTPException(status_code=400, detail="Invalid backup filename.")
        
    if not backup_file.exists():
        raise HTTPException(status_code=404, detail="Backup file not found.")

    # 1. Back up the current DB before overwriting it
    _backup_current_db(db)
    
    # 2. Restore from the selected backup
    try:
        db.close() # Ensure DB is not locked
        shutil.copy(backup_file, DB_FILE_PATH)
        return {"message": f"Successfully restored from {filename}. The application will now reload."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {e}")

@app.get("/system/backups/download/{filename}")
def download_backup(filename: str, api_key: str = Depends(get_api_key)):
    """Allows downloading a specific backup file."""
    file_path = BACKUP_DIR / filename

    # Security Check
    if not is_safe_path(BACKUP_DIR, file_path):
        raise HTTPException(status_code=400, detail="Invalid filename.")
        
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')

@app.delete("/system/backups/{filename}")
def delete_backup(filename: str, api_key: str = Depends(get_api_key)):
    """Deletes a specific backup file."""
    file_path = BACKUP_DIR / filename
    
    # Security Check
    if not is_safe_path(BACKUP_DIR, file_path):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(file_path)
        return {"message": f"Successfully deleted backup: {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")

@app.post("/system/create-new-db")
def create_new_database(db: Session = Depends(get_db), api_key: str = Depends(get_api_key)):
    """Creates a new, empty database after backing up the current one."""
    # 1. Back up the current DB
    _backup_current_db(db)
    
    # 2. Delete the old DB file
    try:
        db.close()
        os.remove(DB_FILE_PATH)
        # The application will auto-create a new DB on the next request
        # because Base.metadata.create_all(bind=engine) is called at startup.
        return {"message": "New database created. The application will now reload."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create new database: {e}")



if __name__ == "__main__":
    import uvicorn
    # Use host and port from settings
    uvicorn.run("app:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)