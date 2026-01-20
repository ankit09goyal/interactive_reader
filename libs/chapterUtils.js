/**
 * Shared utilities for chapter detection in ePub reader
 */

/**
 * Helper function to get base href without fragment
 */
export function getBaseHref(href) {
  if (!href) return "";
  return href.split("#")[0].replace(/^\/+/, "");
}

/**
 * Helper function to flatten nested TOC structure
 */
export function flattenTOC(tocItems) {
  const flattened = [];
  
  function traverse(items) {
    if (!items || !Array.isArray(items)) return;
    
    items.forEach((item) => {
      if (item.href) {
        flattened.push(item);
      }
      if (item.subitems && item.subitems.length > 0) {
        traverse(item.subitems);
      }
    });
  }
  
  traverse(tocItems);
  return flattened;
}

/**
 * Build a map of TOC fragment IDs to TOC items
 */
export function buildTocFragmentMap(toc) {
  const flatToc = flattenTOC(toc);
  const tocFragments = new Map();
  
  for (const tocItem of flatToc) {
    const fragment = tocItem.href.split("#")[1];
    if (fragment) {
      tocFragments.set(fragment, tocItem);
    }
  }
  
  return { flatToc, tocFragments };
}

/**
 * Find the chapter for a given DOM node by searching backwards
 * to find the nearest chapter heading element
 * 
 * @param {Node} selectionNode - The DOM node to find the chapter for
 * @param {Document} contentDocument - The content document containing the node
 * @param {Array} toc - The table of contents array
 * @returns {Object|null} - The matching TOC item or null
 */
export function findChapterFromNode(selectionNode, contentDocument, toc) {
  if (!selectionNode || !contentDocument || !toc || toc.length === 0) return null;

  try {
    const { flatToc, tocFragments } = buildTocFragmentMap(toc);
    
    if (tocFragments.size === 0) {
      // No fragments in TOC, return first item
      return flatToc[0];
    }

    // Get all elements with IDs that match TOC fragments
    const tocElements = [];
    tocFragments.forEach((tocItem, fragmentId) => {
      const element = contentDocument.getElementById(fragmentId);
      if (element) {
        tocElements.push({ element, tocItem });
      }
    });

    if (tocElements.length === 0) {
      return flatToc[0];
    }

    // Get the selection's position element
    const selectionElement = selectionNode.nodeType === 1 
      ? selectionNode 
      : selectionNode.parentElement;
    
    if (!selectionElement) return flatToc[0];

    // Find the nearest chapter heading BEFORE the current position
    let bestMatch = null;
    
    for (const { element, tocItem } of tocElements) {
      // Check if this TOC element comes before (or contains) the selection
      const position = element.compareDocumentPosition(selectionElement);
      
      // DOCUMENT_POSITION_FOLLOWING (4) = selectionElement is after element
      // DOCUMENT_POSITION_CONTAINED_BY (16) = selectionElement is inside element
      if (position & 4 || position & 16 || position === 0) {
        bestMatch = tocItem;
      }
    }

    return bestMatch || flatToc[0];
  } catch (err) {
    console.warn("Error finding chapter from node:", err);
    return null;
  }
}
