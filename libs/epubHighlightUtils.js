/**
 * ePub Highlight Utilities
 * Common utility functions for managing highlights, icons, and annotations in ePub readers.
 * Used by notes, questions, and suggestions highlighting functionality.
 */

/**
 * Icon configuration for different highlight types
 */
export const ICON_CONFIGS = {
  notes: {
    className: "notes-icon",
    dataAttribute: "data-highlight-id",
    title: "This highlight has notes",
    backgroundColor: "transparent",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0075de" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
  },
  question: {
    className: "question-icon",
    dataAttribute: "data-question-id",
    title: "You asked a question about this text",
    backgroundColor: "#0075de",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#0075de" stroke="#0075de"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white"></path><line x1="12" y1="17" x2="12.01" y2="17" stroke="white"></line></svg>`,
  },
  suggestion: {
    className: "suggestion-icon",
    dataAttribute: "data-suggestion-id",
    title: "You made a suggestion about this text",
    backgroundColor: "#0075de",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>`,
  },
};

/**
 * Highlight annotation colors
 */
export const HIGHLIGHT_COLORS = {
  yellow: {"fill": "rgba(255, 255, 0, 0.4)", "fill-opacity": "0.35", "mix-blend-mode": "multiply"},
  green: {"fill": "rgba(0, 255, 0, 0.3)", "fill-opacity": "0.35", "mix-blend-mode": "multiply"},
  blue: {"fill": "rgba(0, 0, 255, 0.2)", "fill-opacity": "0.35", "mix-blend-mode": "multiply"},
  pink: {"fill": "rgba(255, 192, 203, 0.4)", "fill-opacity": "0.35", "mix-blend-mode": "multiply"},
  orange: {"fill": "rgba(255, 165, 0, 0.4)", "fill-opacity": "0.35", "mix-blend-mode": "multiply"},
};

/**
 * Default highlight style for annotations
 */
export const DEFAULT_HIGHLIGHT_STYLE = {
  fill: "rgba(255, 255, 0, 0.4)",
  "fill-opacity": "0.35",
  "mix-blend-mode": "multiply",
};

/**
 * Basic CFI string validation to avoid invalid ranges
 * Prevents obvious bad values from crashing epub.js
 */
export function isLikelyCfiRange(cfiRange) {
  if (typeof cfiRange !== "string") return false;
  const trimmed = cfiRange.trim();
  if (!trimmed.startsWith("epubcfi(") || !trimmed.endsWith(")")) return false;
  if (/undefined|null|NaN/i.test(trimmed)) return false;
  return true;
}

/**
 * Filters highlights to only those with valid, resolvable CFI ranges
 * Uses rendition.getRange to ensure epub.js can resolve the CFI
 */
export async function filterHighlightsByValidRange(
  rendition,
  highlights,
  getCfiRange = (h) => h.cfiRange || h.cfi
) {
  if (!rendition || !highlights || highlights.length === 0) return [];

  const validated = await Promise.all(
    highlights.map(async (highlight) => {
      const cfiRange = getCfiRange(highlight);
      if (!isLikelyCfiRange(cfiRange)) return null;

      try {
        const range = await rendition.getRange(cfiRange);
        if (!range || !range.startContainer) return null;
        return highlight;
      } catch (err) {
        return null;
      }
    })
  );

  return validated.filter(Boolean);
}

/**
 * Creates an icon element to be inserted at the end of a highlight
 * @param {Document} doc - The document to create the element in
 * @param {string} id - Unique identifier for the highlight
 * @param {Object} config - Icon configuration (from ICON_CONFIGS)
 * @param {string} [customTitle] - Optional custom title for the icon
 * @returns {HTMLElement} The created icon element
 */
export function createHighlightIcon(doc, id, config, customTitle = null) {
  const icon = doc.createElement("span");
  icon.className = config.className;
  icon.setAttribute(config.dataAttribute, id);

  // Determine if icon needs a background color (circle style)
  const needsBackground = config.backgroundColor && config.backgroundColor !== "transparent";

  icon.setAttribute(
    "style",
    `
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    min-height: 16px !important;
    margin-left: 2px !important;
    vertical-align: top !important;
    cursor: default !important;
    position: relative !important;
    z-index: 9999 !important;
    visibility: visible !important;
    opacity: 1 !important;
    animation: fadeIn 0.2s ease-in-out;
    ${needsBackground ? `background-color: ${config.backgroundColor} !important;` : ""}
    ${needsBackground ? "border-radius: 50% !important;" : ""}
  `
  );

  icon.innerHTML = config.svgContent;
  icon.title = customTitle || config.title;

  return icon;
}

/**
 * Inserts an icon at the end of a CFI range in the ePub rendition
 * @param {Object} rendition - The ePub.js rendition object
 * @param {string} cfiRange - The CFI range string
 * @param {string} id - Unique identifier for the highlight
 * @param {Object} config - Icon configuration (from ICON_CONFIGS)
 * @param {string} [customTitle] - Optional custom title for the icon
 * @returns {boolean} True if icon was inserted successfully, false otherwise
 */
export function insertIconAtCfiRange(rendition, cfiRange, id, config, customTitle = null) {
  if (!rendition || !cfiRange || !id) return false;

  try {
    const contents = rendition.getContents();
    if (!contents || contents.length === 0) return false;

    let inserted = false;

    contents.forEach((content) => {
      const doc = content.document;
      if (!doc) return;

      // Check if icon already exists for this highlight
      const existingIcon = doc.querySelector(
        `.${config.className}[${config.dataAttribute}="${id}"]`
      );
      if (existingIcon) return;

      try {
        // Use epub.js to get the range from the CFI
        const range = rendition.getRange(cfiRange);
        if (!range) return; // Highlight may be on different page

        // Create the icon
        const icon = createHighlightIcon(doc, id, config, customTitle);

        // Insert icon at the end of the range
        const insertRange = range.cloneRange();
        insertRange.collapse(false); // collapse to end
        insertRange.insertNode(icon);
        inserted = true;
      } catch (err) {
        // Ignore errors for highlights not on current page
      }
    });

    return inserted;
  } catch (err) {
    console.warn(`Failed to insert ${config.className}:`, err);
    return false;
  }
}

/**
 * Adds icons to multiple highlights in the rendition
 * @param {Object} rendition - The ePub.js rendition object
 * @param {Array} highlights - Array of highlight objects with id and cfiRange/cfi properties
 * @param {Object} config - Icon configuration (from ICON_CONFIGS)
 * @param {Function} [getCfiRange] - Optional function to extract CFI range from highlight (default: h => h.cfiRange || h.cfi)
 * @param {Function} [getId] - Optional function to extract ID from highlight (default: h => h._id || h.id)
 * @param {Function} [getTitle] - Optional function to get custom title for highlight
 */
export function addIconsToHighlights(
  rendition,
  highlights,
  config,
  getCfiRange = (h) => h.cfiRange || h.cfi,
  getId = (h) => h._id || h.id,
  getTitle = null
) {
  if (!rendition || !highlights || highlights.length === 0) return;

  highlights.forEach((highlight) => {
    const cfiRange = getCfiRange(highlight);
    const id = getId(highlight);
    const title = getTitle ? getTitle(highlight) : null;

    if (cfiRange && id) {
      insertIconAtCfiRange(rendition, cfiRange, id, config, title);
    }
  });
}

/**
 * Removes all icons of a specific type from the rendition
 * @param {Object} rendition - The ePub.js rendition object
 * @param {string} className - The class name of icons to remove
 */
 export function removeIconsFromRendition(rendition, className) {
  if (!rendition) return;

  try {
    const contents = rendition.getContents();
    if (contents && contents.length > 0) {
      contents.forEach((content) => {
        const doc = content.document;
        if (doc) {
          const icons = doc.querySelectorAll(`.${className}`);
          icons.forEach((icon) => icon.remove());
        }
      });
    }
  } catch (err) {
    // Ignore cleanup errors
  }
} 

/**
 * Adds annotations (highlights) to the rendition
 * @param {Object} rendition - The ePub.js rendition object
 * @param {Array} highlights - Array of highlight objects
 * @param {Object} options - Configuration options
 * @param {string} options.type - Annotation type prefix (e.g., 'highlight', 'question', 'suggestion')
 * @param {Function} [options.getStyle] - Function to get style object for a highlight
 * @param {Function} [options.onClick] - Click handler for the annotation
 * @param {Function} [options.getCfiRange] - Function to extract CFI range from highlight
 * @param {Function} [options.getId] - Function to extract ID from highlight
 * @returns {Array} Array of applied CFI ranges (for cleanup)
 */
export function addAnnotationsToRendition(
  rendition,
  highlights,
  options
) {
  const {
    type,
    getStyle = (h) => h.color ? HIGHLIGHT_COLORS[h.color] : DEFAULT_HIGHLIGHT_STYLE,
    onClick = null,
    getCfiRange = (h) => h.cfiRange || h.cfi,
    getId = (h) => h._id || h.id,
  } = options;

  const applied = [];

  if (!rendition || !highlights || highlights.length === 0) return applied;

  highlights.forEach((highlight) => {
    const cfiRange = getCfiRange(highlight);
    const id = getId(highlight);

    if (!cfiRange || !id) return;

    try {
      rendition.annotations.add(
        "highlight",
        cfiRange,
        {},
        onClick ? () => onClick(id, highlight) : undefined,
        `${type}-${id}`,
        getStyle(highlight)
      );
      applied.push(cfiRange);
    } catch (err) {
      console.warn(`Failed to add ${type} annotation:`, err);
    }
  });

  return applied;
}

/**
 * Removes annotations from the rendition
 * @param {Object} rendition - The ePub.js rendition object
 * @param {Array} cfiRanges - Array of CFI ranges to remove
 */
export function removeAnnotationsFromRendition(rendition, cfiRanges) {
  if (!rendition?.annotations || !cfiRanges) return;

  cfiRanges.forEach((cfiRange) => {
    try {
      rendition.annotations.remove(cfiRange, "highlight");
    } catch (err) {
      // Ignore cleanup errors
    }
  });
}

/**
 * Creates a handler for the 'displayed' and 'rendered' events that adds icons
 * @param {Object} rendition - The ePub.js rendition object
 * @param {Array} highlights - Array of highlight objects
 * @param {Object} config - Icon configuration
 * @param {Function} [getCfiRange] - Function to extract CFI range
 * @param {Function} [getId] - Function to extract ID
 * @param {Function} [getTitle] - Function to get custom title
 * @param {number} [delay=150] - Delay in ms before adding icons
 * @returns {Function} Event handler function
 */
export function createDisplayedHandler(
  rendition,
  highlights,
  config,
  getCfiRange,
  getId,
  getTitle = null,
  delay = 150
) {
  return () => {
    setTimeout(() => {
      addIconsToHighlights(rendition, highlights, config, getCfiRange, getId, getTitle);
    }, delay);
  };
}

/**
 * Sets up highlight rendering with icons for the rendition
 * This is a convenience function that combines annotation adding, icon rendering,
 * and event handling setup
 * 
 * @param {Object} rendition - The ePub.js rendition object
 * @param {Array} highlights - Array of highlight objects
 * @param {Object} options - Configuration options
 * @param {string} options.type - Type prefix for annotations (e.g., 'highlight', 'question', 'suggestion')
 * @param {Object} options.iconConfig - Icon configuration from ICON_CONFIGS
 * @param {Function} [options.getStyle] - Function to get highlight style for each highlight
 * @param {Function} [options.onClick] - Click handler
 * @param {Function} [options.getCfiRange] - Function to extract CFI range
 * @param {Function} [options.getId] - Function to extract ID
 * @param {Function} [options.getTitle] - Function to get custom title for icons
 * @param {boolean} [options.showIcons=true] - Whether to show icons
 * @param {Function} [options.filterForIcons] - Optional filter function for which highlights should show icons
 * @returns {Object} Cleanup object with { cleanup: Function, appliedCfiRanges: Array }
 */
export function setupHighlightRendering(rendition, highlights, options) {
  const {
    type,
    iconConfig,
    getStyle = (h) => h.color ? HIGHLIGHT_COLORS[h.color] : DEFAULT_HIGHLIGHT_STYLE,
    onClick = null,
    getCfiRange = (h) => h.cfiRange || h.cfi,
    getId = (h) => h._id || h.id,
    getTitle = null,
    showIcons = true,
    filterForIcons = null,
  } = options;

  if (!rendition || !highlights || highlights.length === 0) {
    return { cleanup: () => {}, appliedCfiRanges: [] };
  }

  // Add annotations
  const appliedCfiRanges = addAnnotationsToRendition(rendition, highlights, {
    type,
    getStyle,
    onClick,
    getCfiRange,
    getId,
  });

  // Filter highlights for icons if needed
  const highlightsForIcons = filterForIcons
    ? highlights.filter(filterForIcons)
    : highlights;

  // Create displayed handler for icons
  const handleDisplayed = showIcons
    ? createDisplayedHandler(rendition, highlightsForIcons, iconConfig, getCfiRange, getId, getTitle)
    : null;

  // Add event listeners
  if (handleDisplayed) {
    rendition.on("rendered", handleDisplayed);
    rendition.on("displayed", handleDisplayed);
    // Initial icon rendering
    setTimeout(() => {
      addIconsToHighlights(rendition, highlightsForIcons, iconConfig, getCfiRange, getId, getTitle);
    }, 200);
  }

  // Return cleanup function
  const cleanup = () => {
    // Remove event listeners
    if (handleDisplayed) {
      try {
        rendition.off("rendered", handleDisplayed);
        rendition.off("displayed", handleDisplayed);
      } catch (err) {
        // Ignore cleanup errors
      }
    }

    // Remove icons
    if (showIcons && iconConfig) {
      removeIconsFromRendition(rendition, iconConfig.className);
    }

    // Remove annotations
    removeAnnotationsFromRendition(rendition, appliedCfiRanges);
  };

  return { cleanup, appliedCfiRanges };
}

/**
 * Removes a highlight's annotation and icon directly from the rendition
 * Used for immediate cleanup when deleting a highlight
 * 
 * @param {Object} rendition - The ePub.js rendition object
 * @param {string} highlightId - The ID of the highlight to remove
 * @param {Object} highlight - The highlight object containing cfiRange
 * @param {Object} iconConfig - Icon configuration containing className and dataAttribute
 */
export function removeHighlightFromRendition(rendition, highlightId, highlight, iconConfig) {
  if (!rendition || !highlightId) return;

  // Directly remove the annotation
  if (highlight?.cfiRange) {
    try {
      rendition.annotations.remove(highlight.cfiRange, "highlight");
    } catch (err) {
      console.warn("Failed to remove annotation:", err);
    }
  }

  // Directly remove the icon
  if (iconConfig) {
     try {
        const contents = rendition.getContents();
        if (contents && contents.length > 0) {
          contents.forEach((content) => {
            const doc = content.document;
            if (doc) {
              const icon = doc.querySelector(
                `.${iconConfig.className}[${iconConfig.dataAttribute}="${highlightId}"]`
              );
              if (icon) icon.remove();
            }
          });
        }
      } catch (err) {
        console.warn("Failed to remove icon:", err);
      }
  }
}
