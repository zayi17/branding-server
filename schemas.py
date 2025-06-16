# schemas.py
from pydantic import BaseModel
from typing import Optional, List
import datetime # If not already there

# Site schemas
class SiteBase(BaseModel):
    name: str
    description: Optional[str] = None

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Site(SiteBase):
    id: int

    class Config:
        orm_mode = True

# Brand Styling schemas
class BrandStylingBase(BaseModel):
    name: str
    description: Optional[str] = None

class BrandStylingCreate(BrandStylingBase):
    master_brand_id: Optional[int] = None

class BrandStylingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    master_brand_id: Optional[int] = None

class BrandStyling(BrandStylingBase):
    id: int
    site_id: int
    master_brand_id: Optional[int] = None

    class Config:
        orm_mode = True

class BrandStylingWithInheritance(BrandStyling):
    sub_brands: List["BrandStylingWithInheritance"] = []
    
    class Config:
        orm_mode = True


# Style Asset schemas
class StyleAssetBase(BaseModel):
    name: str
    type: str
    value: str
    resolved_value: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    is_important: Optional[bool] = False
    group_name: Optional[str] = "General"
    selector: Optional[str] = None # <<< ADD THIS LINE

# Also ensure it's in StyleAssetUpdate class if not inheriting from StyleAssetBase
is_important: Optional[bool] = None

class StyleAssetCreate(StyleAssetBase):
    # For creation, file_path is not typically sent directly
    pass

class StyleAssetUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[str] = None
    # If you want to allow updating resolved_value directly via API (unlikely, as it's calculated)
    # resolved_value: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    is_important: Optional[bool] = None
    group_name: Optional[str] = None


    # file_path is handled via file upload in the API, not direct schema update
    # file: Optional[UploadFile] is handled in the API endpoint

class StyleAsset(StyleAssetBase):
    id: int
    brand_styling_id: int

    class Config:
        orm_mode = True
        
        
# Add to schemas.py after StyleAsset schemas

class StyleAssetVariantBase(BaseModel):
    breakpoint: str
    value: str
    resolved_value: Optional[str] = None  # <<< ADDED HERE
    is_important: Optional[bool] = False

class StyleAssetVariantCreate(StyleAssetVariantBase):
    pass

class StyleAssetVariantUpdate(BaseModel):
    value: Optional[str] = None
    # resolved_value: Optional[str] = None # If direct update is needed
    is_important: Optional[bool] = None

class StyleAssetVariant(StyleAssetVariantBase):
    id: int
    # Make asset_id optional since it's missing in some responses
    asset_id: Optional[int] = None

    class Config:
        orm_mode = True

# Update the StyleAsset model to include variants
class StyleAsset(StyleAssetBase):
    id: int
    brand_styling_id: int
    variants: List[StyleAssetVariant] = []

    class Config:
        orm_mode = True
        

BrandStylingWithInheritance.update_forward_refs()


class BrandStylingInheritanceInfo(BaseModel):
    has_master: bool
    master_brand_id: Optional[int] = None
    master_brand: Optional[BrandStyling] = None
    is_master_for: List[BrandStyling] = []
    
    class Config:
        orm_mode = True
        
        
class StyleAssetWithInheritance(StyleAsset):
    """Schema for StyleAsset including inheritance details."""
    source: str # e.g., "local", "inherited"
    overridden: bool # True if this asset overrides a master asset
    master_asset_id: Optional[int] = None # ID of the master asset if overridden or inherited
    master_is_important: Optional[bool] = None # is_important status of the master asset

    class Config:
        orm_mode = True # Still support ORM mode if needed, though we'll return dict usually


class BrandLogBase(BaseModel):
    type: str
    ref: Optional[str] = None
    message: str

class BrandLogCreate(BrandLogBase):
    pass

class BrandLog(BrandLogBase): # This schema is for response
    id: int
    brand_styling_id: int
    timestamp: datetime.datetime

    class Config:
        orm_mode = True