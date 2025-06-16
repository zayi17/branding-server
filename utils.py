# utils.py
import os
from sqlalchemy.orm import Session
from models import StyleAsset, BrandStyling, StyleAssetVariant 

import re
import json
import datetime

from config import settings, CONTAINER_ASSET_DIR_ABS


def parse_css_variables(css_content):
    variables = {}
    groups = {}
    current_group = "General"
    
    root_match = re.search(r':root\s*{([^}]*)}', css_content, re.DOTALL)
    if not root_match:
        return variables, groups

    root_content = root_match.group(1)
    lines = root_content.split('\n')
    
    for line in lines:
        group_match = re.search(r'/\*\s*GROUP:\s*(.*?)\s*\*/', line)
        if group_match:
            current_group = group_match.group(1).strip()
            if current_group not in groups:
                groups[current_group] = []
            continue
        
        var_match = re.search(r'\s*(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);', line)
        if not var_match:
            continue
            
        name = var_match.group(1).strip()
        raw_value_part = var_match.group(2).strip()
        is_important = False
        value = raw_value_part
        if value.lower().endswith('!important'):
            is_important = True
            value = value[:-len('!important')].strip()
        
        var_type = "other" 
        
        variables[name] = {
            "value": value, 
            "type": var_type, 
            "is_important": is_important,
            "group": current_group  
        }
        if current_group not in groups:
            groups[current_group] = []
        groups[current_group].append(name)
    return variables, groups

def create_directories_if_not_exist():
    pass
 
def save_local_backup(styling_id: int, db: Session) -> str:
    styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if not styling:
        return None
    assets = db.query(StyleAsset).filter(StyleAsset.brand_styling_id == styling_id).all()
    backup_data = {
        "styling": {
            "id": styling.id, "name": styling.name, "description": styling.description,
            "site_id": styling.site_id, "created_at": datetime.datetime.now().isoformat()
        },
        "assets": [
            {
                "name": asset.name, "type": asset.type, "value": asset.value,
                "description": asset.description, "file_path": asset.file_path,
                "is_important": asset.is_important, "group_name": asset.group_name,
                "selector": asset.selector 
            } for asset in assets
        ]
    }
    backup_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "exports", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_name = re.sub(r'[^\w\-_\.]', '_', styling.name)
    filename = os.path.join(backup_dir, f"{sanitized_name}_{timestamp}.json")
    try:
        with open(filename, "w") as f:
            json.dump(backup_data, f, indent=2)
        # print(f"Backup created successfully: {filename}")
        return filename
    except Exception as e:
        # print(f"Error creating backup for styling {styling_id}: {e}")
        return None

def generate_css(styling_id: int, db: Session):
    db_styling = db.query(BrandStyling).filter(BrandStyling.id == styling_id).first()
    if not db_styling:
        return False

    css_parts = [f"/* CSS for Brand Styling: {db_styling.name} (ID: {styling_id}) */"]
    
    if db_styling.master_brand_id:
        master_styling = db.query(BrandStyling).filter(BrandStyling.id == db_styling.master_brand_id).first()
        master_name = master_styling.name if master_styling else "Unknown Master Brand"
        base_url = settings.BASE_URL or "http://localhost:8000"
        css_parts.append(f"/* Inherits from Master Brand: {master_name} (ID: {db_styling.master_brand_id}) */")
        css_parts.append(f"@import url('{base_url}/brand/{db_styling.master_brand_id}/css');\n")
    
    local_assets = db.query(StyleAsset).filter(StyleAsset.brand_styling_id == styling_id).all()
    
    root_variables_by_group = {}
    selector_declarations_by_ui_group_then_selector = {} # New structure for declarations

    css_variables_assets = []
    css_declaration_assets = [] 
    legacy_class_rule_assets = []

    for asset in local_assets:
        if asset.selector and asset.type == "css_declaration": # New type for individual rules
            css_declaration_assets.append(asset)
        elif asset.type == "class_rule": # Old type, for temporary handling if needed
            legacy_class_rule_assets.append(asset)
        elif not asset.selector: # Assumed to be CSS Variables
            css_variables_assets.append(asset)

    # Process CSS Variables into :root
    for asset in css_variables_assets:
        group_name = asset.group_name or "General Variables"
        if group_name not in root_variables_by_group:
            root_variables_by_group[group_name] = []
        important_suffix = " !important" if asset.is_important else ""
        # Include asset.type in a comment for clarity if desired
        root_variables_by_group[group_name].append(f"  {asset.name}: {asset.value}{important_suffix}; /* TYPE: {asset.type} */")

    if root_variables_by_group:
        root_content_parts = []
        for group_name, vars_in_group in sorted(root_variables_by_group.items()):
            if vars_in_group:
                root_content_parts.append(f"  /* GROUP: {group_name} */")
                root_content_parts.extend(vars_in_group)
                root_content_parts.append("") 
        if root_content_parts:
            css_parts.append(":root {\n" + "\n".join(root_content_parts).strip() + "\n}")

    # Process new individual CSS declarations
    for asset_decl in css_declaration_assets:
        ui_group_name = asset_decl.group_name or "General Selectors"
        selector_str = asset_decl.selector 
        
        if ui_group_name not in selector_declarations_by_ui_group_then_selector:
            selector_declarations_by_ui_group_then_selector[ui_group_name] = {}
        if selector_str not in selector_declarations_by_ui_group_then_selector[ui_group_name]:
            selector_declarations_by_ui_group_then_selector[ui_group_name][selector_str] = []
        
        prop_name = asset_decl.name # CSS Property
        prop_value = asset_decl.value # CSS Value
        important_suffix = " !important" if asset_decl.is_important else ""
        selector_declarations_by_ui_group_then_selector[ui_group_name][selector_str].append(f"  {prop_name}: {prop_value}{important_suffix};")

    # Process legacy class_rule assets (should be migrated)
    for asset_legacy_rule in legacy_class_rule_assets:
        ui_group_name = asset_legacy_rule.group_name or "Legacy Selector Rules"
        selector_str = asset_legacy_rule.name # In old model, name was the selector
        
        if ui_group_name not in selector_declarations_by_ui_group_then_selector:
            selector_declarations_by_ui_group_then_selector[ui_group_name] = {}
        if selector_str not in selector_declarations_by_ui_group_then_selector[ui_group_name]:
            selector_declarations_by_ui_group_then_selector[ui_group_name][selector_str] = []
        
        # Add the old raw string value, clearly marked as legacy
        # This will likely result in duplicated rule blocks if not handled carefully during transition.
        # Best to migrate data to "css_declaration" type.
        selector_declarations_by_ui_group_then_selector[ui_group_name][selector_str].append(f"  /* LEGACY RULE STRING: {asset_legacy_rule.value.strip()} */")


    # Assemble selector rule blocks from the new structure
    if selector_declarations_by_ui_group_then_selector:
        css_parts.append("\n/* Selectors & Rules */")
        for ui_group_name, selectors_in_group in sorted(selector_declarations_by_ui_group_then_selector.items()):
            css_parts.append(f"\n/* UI GROUP: {ui_group_name} */")
            for selector_str, declarations in sorted(selectors_in_group.items()):
                if declarations: # Only print if there are actual rules
                    css_parts.append(f"{selector_str} {{")
                    css_parts.extend(declarations)
                    css_parts.append("}")
            
    # Variants for CSS variables (assets where asset.selector is NULL)
    css_variable_asset_ids = [asset.id for asset in css_variables_assets]
    if css_variable_asset_ids:
        variants = db.query(StyleAssetVariant).filter(StyleAssetVariant.asset_id.in_(css_variable_asset_ids)).all()
        assets_by_id = {asset.id: asset for asset in css_variables_assets}
        variants_by_breakpoint = {}

        for variant in variants:
            if variant.asset_id in assets_by_id: 
                parent_asset = assets_by_id[variant.asset_id]
                if variant.breakpoint not in variants_by_breakpoint:
                    variants_by_breakpoint[variant.breakpoint] = []
                variants_by_breakpoint[variant.breakpoint].append({
                    "name": parent_asset.name, "value": variant.value, "is_important": variant.is_important
                })
        
        for breakpoint_key, vars_in_bp in sorted(variants_by_breakpoint.items()):
            if not vars_in_bp: continue
            
            bp_asset = db.query(StyleAsset).filter(
                StyleAsset.brand_styling_id == styling_id, 
                StyleAsset.name == breakpoint_key,    
                StyleAsset.type == "dimension",
                StyleAsset.selector == None          
            ).first()

            media_query_condition = breakpoint_key 
            if bp_asset:
                # Simplified media query condition logic
                raw_bp_value = bp_asset.value.lower()
                if "mobile" in breakpoint_key.lower() or "max-width" in raw_bp_value :
                    media_query_condition = f"(max-width: {bp_asset.value})"
                elif "desktop" in breakpoint_key.lower() or "min-width" in raw_bp_value and not "max-width" in raw_bp_value:
                     media_query_condition = f"(min-width: {bp_asset.value})"
                elif "tablet" in breakpoint_key.lower() or ("min-width" in raw_bp_value and "max-width" in raw_bp_value):
                    # Attempt to extract min and max if combined, otherwise use the value as is
                    # This is a heuristic, robust parsing of complex MQ values is hard
                    min_match = re.search(r'min-width:\s*([^)\s]+)', raw_bp_value)
                    max_match = re.search(r'max-width:\s*([^)\s]+)', raw_bp_value)
                    if min_match and max_match:
                        media_query_condition = f"(min-width: {min_match.group(1)}) and (max-width: {max_match.group(1)})"
                    else: # Fallback if complex value not easily parsed
                        media_query_condition = f"({bp_asset.value})"

                else: 
                    media_query_condition = f"({bp_asset.value})" 
            # else:
                # print(f"Warning: Breakpoint dimension asset '{breakpoint_key}' not found for styling {styling_id}. Using key as media condition.")

            css_parts.append(f"\n@media {media_query_condition} {{\n  :root {{")
            for var_item in vars_in_bp:
                important = " !important" if var_item["is_important"] else ""
                css_parts.append(f"    {var_item['name']}: {var_item['value']}{important};")
            css_parts.append("  }\n}")

    final_css = "\n".join(css_parts).strip()
    
    css_dir = os.path.join(CONTAINER_ASSET_DIR_ABS, "brands", str(styling_id))
    os.makedirs(css_dir, exist_ok=True)
    css_path = os.path.join(css_dir, "style.css")
    
    try:
        with open(css_path, "w") as f:
            f.write(final_css)
    except Exception as e:
        # print(f"Error writing CSS file for styling {styling_id}: {e}")
        return False
        
    return True