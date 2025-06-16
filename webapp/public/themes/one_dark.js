// Modified One Dark theme for Ace editor to mimic Gemini colors
(function() {
    // Create CSS class for theme
    var style = document.createElement('style');
    style.type = 'text/css';
    // Keep original class name ace-one-dark but change colors
    style.innerHTML = `.ace-one-dark .ace_gutter {
    background:rgb(35, 35, 35); /* Background color from screenshot */
    color:rgb(196, 196, 196); /* Comments color for gutter numbers */
}
.ace-one-dark .ace_print-margin {
    width: 1px;
    background: #e8e8e8 /* Default or keep as is */
}
.ace-one-dark {
    background-color:rgb(28, 28, 28); /* Background color from screenshot */
    color: #abb2bf; /* Default text color from screenshot */
}
.ace-one-dark .ace_cursor {
    color: #528bff; /* Cursor color from screenshot */
}
.ace-one-dark .ace_marker-layer .ace_selection {
    background: rgba(22, 22, 22, 0.4); /* Adjusted selection color for visibility */
}
.ace-one-dark.ace_multiselect .ace_selection.ace_start {
    box-shadow: 0 0 3px 0 #282c34; /* Match background */
    border-radius: 2px
}
.ace-one-dark .ace_marker-layer .ace_step {
    background: #c6dbae /* Keep or adjust if visible in screenshot */
}
.ace-one-dark .ace_marker-layer .ace_bracket {
    margin: -1px 0 0 -1px;
    border: 1px solid #747369 /* Keep or adjust */
}
.ace-one-dark .ace_marker-layer .ace_active-line {
    background: rgba(180, 180, 180, 0.08); /* Subtle active line background */
}
.ace-one-dark .ace_gutter-active-line {
    background-color: rgba(180, 180, 180, 0.08); /* Match active line background */
}
.ace-one-dark .ace_marker-layer .ace_selected-word {
    border: 1px solid #3d4350 /* Keep or adjust */
}
.ace-one-dark .ace_fold {
    background-color: #61afef; /* Match function name color */
    border-color: #abb2bf; /* Match default text color */
}
.ace-one-dark .ace_keyword {
    color: #c678dd; /* Keyword color */
}
.ace-one-dark .ace_keyword.ace_operator {
    color: #abb2bf; /* Operators match default text color */
}
.ace-one-dark .ace_keyword.ace_other.ace_unit {
    color: #d19a66; /* Units match numeric color */
}
.ace-one-dark .ace_constant.ace_language {
    color: #d19a66; /* Constants match numeric color */
}
.ace-one-dark .ace_constant.ace_numeric {
    color: #d19a66; /* Numeric color */
}
.ace-one-dark .ace_constant.ace_character {
    color: #98c379; /* Character constants match string color */
}
.ace-one-dark .ace_constant.ace_other {
    color: #98c379; /* Other constants match string color */
}
.ace-one-dark .ace_support.ace_function {
    color: #61afef; /* Support functions match function name color */
}
.ace-one-dark .ace_support.ace_constant {
    color: #d19a66; /* Support constants match numeric color */
}
.ace-one-dark .ace_support.ace_class {
    color: #e5c07b; /* Class names - keeping original as not clear in screenshot */
}
.ace-one-dark .ace_support.ace_type {
    color: #e5c07b; /* Type names - keeping original */
}
.ace-one-dark .ace_storage {
    color: #c678dd; /* Storage keywords match keyword color */
}
.ace-one-dark .ace_storage.ace_type {
    color: #c678dd; /* Storage types match keyword color */
}
.ace-one-dark .ace_invalid {
    color: #fff;
    background-color: #f2777a /* Keep or adjust */
}
.ace-one-dark .ace_invalid.ace_deprecated {
    color: #272b33; /* Keep or adjust */
    background-color: #d27b53
}
.ace-one-dark .ace_string {
    color: #98c379; /* String color from screenshot */
}
.ace-one-dark .ace_string.ace_regexp {
    color: #e06c75; /* Regex color - keeping original as not clear in screenshot */
}
.ace-one-dark .ace_comment {
    font-style: italic;
    color: #5c6370; /* Comment color */
}
.ace-one-dark .ace_variable {
    color: #abb2bf; /* Variable names match default text color */
}
.ace-one-dark .ace_variable.ace_parameter {
    color: #d19a66; /* Parameters match numeric color */
}
.ace-one-dark .ace_meta.ace_tag {
    color: #98c379; /* HTML tags match string color */
}
.ace-one-dark .ace_entity.ace_other.ace_attribute-name {
    color: #d19a66; /* HTML attribute names match numeric color */
}
.ace-one-dark .ace_entity.ace_name.ace_function {
    color: #61afef; /* Function names color */
}
.ace-one-dark .ace_entity.ace_name.ace_tag {
    color: #98c379; /* XML/HTML tag names match string color */
}
.ace-one-dark .ace_markup.ace_heading {
    color: #98c379; /* Markup heading match string color */
}
.ace-one-dark .ace_indent-guide {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWPQ09NrYAgMjP4PAAtGAwchHMyAAAAAAElFTkSuQmCC) right repeat-y /* Keep or adjust */
}
.ace-one-dark .ace_indent-guide-active {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC) right repeat-y; /* Keep or adjust */
}`;
    document.head.appendChild(style);

    // Register the theme with Ace - keep original name
    ace.define("ace/theme/one_dark", ["require", "exports", "module", "ace/lib/dom"], function(require, exports, module) {
        exports.isDark = true;
        exports.cssClass = "ace-one-dark"; // Keep original class name
        exports.cssText = style.innerHTML;

        var dom = require("ace/lib/dom");
        dom.importCssString(exports.cssText, exports.cssClass);
        // Optional: Add text token colors for better matching in some Ace versions
        exports.textTokenColors = {
            "comment": "#5c6370",
            "keyword": "#c678dd",
            "string": "#98c379",
            "constant.numeric": "#d19a66",
            "entity.name.function": "#61afef",
            "variable": "#abb2bf",
            "operator": "#abb2bf",
            "meta.tag": "#98c379",
            "entity.other.attribute-name": "#d19a66"
            // Add other token types as needed based on Ace's tokenization
        };
    });
})();