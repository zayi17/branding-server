
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, create_engine, ForeignKeyConstraint, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, backref

import datetime
# Import settings from config.py
from config import settings

# Database configuration - Now using DB_URL from settings
SQLALCHEMY_DATABASE_URL = settings.DB_URL

# The check_same_thread=False is specific to SQLite and needed for FastAPI's default threading.
# For other databases (like PostgreSQL), you would remove this and configure connection pooling.
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    brand_stylings = relationship("BrandStyling", back_populates="site", cascade="all, delete-orphan")

class BrandStyling(Base):
    __tablename__ = "brand_stylings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    
    # New column for inheritance
    master_brand_id = Column(Integer, ForeignKey("brand_stylings.id"), nullable=True)

    # Relationships
    site = relationship("Site", back_populates="brand_stylings")
    assets = relationship("StyleAsset", back_populates="brand_styling", cascade="all, delete-orphan")
    
    # New relationships for inheritance
    # Self-referential relationship for master/sub brands
    sub_brands = relationship("BrandStyling", 
                             backref=backref("master_brand", remote_side=[id]),
                             foreign_keys=[master_brand_id])

class StyleAsset(Base):
    __tablename__ = "style_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    value = Column(String)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    is_important = Column(Boolean, default=False)
    group_name = Column(String, default="General") 
    selector = Column(String, nullable=True)

    brand_styling_id = Column(Integer, ForeignKey("brand_stylings.id"))
    brand_styling = relationship("BrandStyling", back_populates="assets")
    variants = relationship("StyleAssetVariant", back_populates="asset", cascade="all, delete-orphan")
    

class StyleAssetVariant(Base):
    __tablename__ = "style_asset_variants"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("style_assets.id", ondelete="CASCADE"))
    breakpoint = Column(String)  # 'mobile', 'tablet', 'desktop'
    value = Column(String)
    is_important = Column(Boolean, default=False)

    # Relationship to parent asset
    asset = relationship("StyleAsset", back_populates="variants")




class BrandLog(Base):
    __tablename__ = "brand_logs"

    id = Column(Integer, primary_key=True, index=True)
    brand_styling_id = Column(Integer, ForeignKey("brand_stylings.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    type = Column(String(50), index=True, nullable=False) # 'error', 'info', 'warn'
    ref = Column(String(255), nullable=True) # Section reference
    message = Column(Text, nullable=False)

    brand_styling = relationship("BrandStyling") # Optional: if you need to navigate back