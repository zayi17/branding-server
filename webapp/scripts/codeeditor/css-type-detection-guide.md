# CSS Type Detection & Management Documentation

## Overview

The CSS editor now features enhanced type detection for CSS variables, allowing you to organize your variables by type and group them more effectively. The system automatically detects variable types based on their values, but you can also explicitly specify types using comments.

## Type Detection Methods

1. **Automatic Detection**: The system analyzes variable values to determine their type:
   - Color values (`#hex`, `rgb()`, color names)
   - Dimensions (values with units like `px`, `rem`, `%`)
   - Typography (font family values, quoted strings)
   - Images (values using `url()` or data URIs)

2. **Explicit Type Declaration**: You can specify types with comments:
   - At the group level: `/* GROUP: Colors */ /* TYPE: col */`
   - At the variable level: `--primary-color: #ff0000; /* TYPE: col */`

3. **Group Context**: Variables in a group where most variables have a consistent type will inherit that type.

## Type Codes

Use these short codes in type comments:

| Code | Type | Description |
|------|------|-------------|
| `col` | Color | Colors in any format (#hex, rgb, names) |
| `dim` | Dimension | Sizes, spacing, measurements with units |
| `typ` | Typography | Font families, text properties |
| `img` | Image | Image URLs and data URIs |
| `cls` | Classes | CSS classes and selectors |
| `oth` | Other | Miscellaneous properties |

## Usage Examples

### Group-Level Type Declaration

```css
/* GROUP: Brand Colors */ /* TYPE: col */
--primary: #407196;
--secondary: #127112;
--accent: #ff5500;
```

All variables in this group will be treated as colors.

### Variable-Level Type Declaration

```css
/* GROUP: Mixed Values */
--spacing: 20px; /* TYPE: dim */
--highlight: #ffcc00; /* TYPE: col */
--main-font: 'Arial, sans-serif'; /* TYPE: typ */
```

Each variable has its own explicitly declared type.

### Combined Approach

```css
/* GROUP: Layout */ /* TYPE: dim */
--container-width: 1200px;
--gutter: 16px;

/* GROUP: Mixed */
--logo-url: url('/images/logo.png'); /* TYPE: img */
--overlay-color: rgba(0,0,0,0.5); /* TYPE: col */
```

The first group uses a group-level type declaration, while the second group has variable-level type declarations.

## Keyboard Shortcuts

- Type `colgroup` + Tab to insert a color group template
- Type `dimgroup` + Tab to insert a dimension group template
- Type `typgroup` + Tab to insert a typography group template
- Type `colvar` + Tab to insert a color variable template
- Type `dimvar` + Tab to insert a dimension variable template
- Type `typvar` + Tab to insert a typography variable template

## Best Practices

1. **Use Group-Level Types** for related variables of the same type
2. **Use Variable-Level Types** for mixed groups
3. **Let Auto-Detection Handle** obvious types like colors
4. **Use Descriptive Variable Names** to aid in type inference
5. **Group Related Variables** together for better organization

## After Saving

When you save your CSS, the system:

1. Parses all variables and their declared or detected types
2. Stores the type information in the database
3. Organizes the variables in the visual UI by their types
4. Preserves all your type comments in the CSS editor

The TYPE comments are used only for parsing and won't affect the rendered CSS.
