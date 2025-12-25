"use client";

import { useCallback, useRef } from "react";

/**
 * usePDFRenderer - Custom hook for rendering PDF pages to canvas
 */
export function usePDFRenderer({
  pdfDoc,
  pdfjsLibRef,
  scale,
  viewMode,
  isFullscreen,
  containerRef,
  renderTasksRef,
  textLayerRefs,
  highlights = [],
}) {
  // Apply highlights to text layer after rendering
  const applyHighlights = useCallback(
    (pageNum) => {
      const textLayerDiv = textLayerRefs.current.get(pageNum);
      if (!textLayerDiv) return;

      // Get highlights for this page
      const pageHighlights = highlights.filter((h) => h.pageNumber === pageNum);
      if (pageHighlights.length === 0) return;

      // Get all text spans (excluding already highlighted ones)
      let textSpans = Array.from(
        textLayerDiv.querySelectorAll("span:not(.pdf-highlight)")
      );
      if (textSpans.length === 0) return;

      // Apply each highlight
      pageHighlights.forEach((highlight) => {
        const highlightText = highlight.text.trim();
        if (!highlightText) return;

        // Build full text from current spans
        const fullText = textSpans.map((span) => span.textContent).join("");

        // Simple text search (case-insensitive, normalize whitespace)
        const searchText = highlightText.replace(/\s+/g, " ").toLowerCase();
        const normalizedFullText = fullText.replace(/\s+/g, " ").toLowerCase();
        const searchIndex = normalizedFullText.indexOf(searchText);

        if (searchIndex === -1) return;

        // Find character position in original text
        // Map normalized position back to original
        let originalIndex = 0;
        let normalizedPos = 0;
        for (let i = 0; i < fullText.length && normalizedPos < searchIndex; i++) {
          const char = fullText[i];
          if (!char.match(/\s/) || (i > 0 && !fullText[i - 1].match(/\s/))) {
            normalizedPos++;
          }
          if (normalizedPos <= searchIndex) {
            originalIndex = i + 1;
          }
        }

        // Find spans that contain the highlight
        let charCount = 0;
        const spansToModify = [];

        for (const span of textSpans) {
          const spanText = span.textContent;
          const spanStart = charCount;
          const spanEnd = charCount + spanText.length;

          if (originalIndex < spanEnd && originalIndex + highlightText.length > spanStart) {
            const startOffset = Math.max(0, originalIndex - spanStart);
            const endOffset = Math.min(spanText.length, originalIndex + highlightText.length - spanStart);
            spansToModify.push({ span, startOffset, endOffset });
          }

          charCount = spanEnd;
        }

        // Apply highlight (process in reverse to maintain DOM structure)
        for (let i = spansToModify.length - 1; i >= 0; i--) {
          const { span, startOffset, endOffset } = spansToModify[i];
          const spanText = span.textContent;
          const before = spanText.substring(0, startOffset);
          const highlightPart = spanText.substring(startOffset, endOffset);
          const after = spanText.substring(endOffset);

          if (highlightPart) {
            // Create highlight span with same styling
            const highlightSpan = document.createElement("span");
            highlightSpan.textContent = highlightPart;
            highlightSpan.className = "pdf-highlight";
            highlightSpan.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
            highlightSpan.style.color = "transparent";
            highlightSpan.style.position = span.style.position;
            highlightSpan.style.left = span.style.left;
            highlightSpan.style.top = span.style.top;
            highlightSpan.style.fontSize = span.style.fontSize;
            highlightSpan.style.fontFamily = span.style.fontFamily;
            highlightSpan.style.whiteSpace = span.style.whiteSpace;
            highlightSpan.style.cursor = "text";
            highlightSpan.dataset.questionId = highlight.questionId;
            highlightSpan.dataset.pageNum = pageNum;

            // Update original span
            span.textContent = before;

            // Insert highlight and after text if needed
            if (after) {
              const afterSpan = span.cloneNode(false);
              afterSpan.textContent = after;
              Object.assign(afterSpan.style, {
                position: span.style.position,
                left: span.style.left,
                top: span.style.top,
                fontSize: span.style.fontSize,
                fontFamily: span.style.fontFamily,
                whiteSpace: span.style.whiteSpace,
                cursor: "text",
              });
              afterSpan.dataset.pageNum = pageNum;
              span.parentNode.insertBefore(highlightSpan, span.nextSibling);
              span.parentNode.insertBefore(afterSpan, highlightSpan.nextSibling);
            } else {
              span.parentNode.insertBefore(highlightSpan, span.nextSibling);
            }
          }
        }

        // Refresh textSpans list for next highlight
        textSpans = Array.from(
          textLayerDiv.querySelectorAll("span:not(.pdf-highlight)")
        );
      });
    },
    [highlights, textLayerRefs]
  );

  // Render text layer for a page
  const renderTextLayer = useCallback(
    async (page, viewport, pageNum) => {
      const textLayerDiv = textLayerRefs.current.get(pageNum);
      if (!textLayerDiv) return;

      // Clear existing content
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      try {
        const textContent = await page.getTextContent();

        // Render each text item
        textContent.items.forEach((item) => {
          const tx = pdfjsLibRef.current.Util.transform(
            viewport.transform,
            item.transform
          );

          const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
          const fontAscent = item.fontName ? fontSize * 0.8 : fontSize;

          const span = document.createElement("span");
          span.textContent = item.str;
          span.style.left = `${tx[4]}px`;
          span.style.top = `${tx[5] - fontAscent}px`;
          span.style.fontSize = `${fontSize}px`;
          span.style.fontFamily = item.fontName || "sans-serif";
          span.style.position = "absolute";
          span.style.whiteSpace = "pre";
          span.style.color = "transparent";
          span.style.cursor = "text";
          span.dataset.pageNum = pageNum;

          textLayerDiv.appendChild(span);
        });

        // Apply highlights after rendering text
        setTimeout(() => {
          applyHighlights(pageNum);
        }, 0);
      } catch (err) {
        console.error(`Error rendering text layer for page ${pageNum}:`, err);
      }
    },
    [pdfjsLibRef, textLayerRefs, applyHighlights]
  );

  // Render a single page to a canvas with text layer
  const renderPageToCanvas = useCallback(
    async (pageNum, canvas, fitToViewport = false) => {
      if (!pdfDoc || !canvas) return false;

      const existingTask = renderTasksRef.current.get(pageNum);
      if (existingTask) {
        try {
          existingTask.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTasksRef.current.delete(pageNum);
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1 });

        let effectiveScale;

        if (fitToViewport && viewMode === "one-page") {
          const container = containerRef.current;
          const toolbarHeight = 56;
          const footerHeight = 40;
          const padding = 0;

          const availableWidth =
            (container?.clientWidth || window.innerWidth) - padding;
          const availableHeight =
            (isFullscreen
              ? window.innerHeight
              : Math.min(window.innerHeight, 900)) -
            toolbarHeight -
            footerHeight -
            padding;

          const scaleX = availableWidth / viewport.width;
          const scaleY = availableHeight / viewport.height;
          effectiveScale = Math.min(scaleX, scaleY, 2) * scale;
        } else {
          const container = containerRef.current;
          const containerWidth = container?.clientWidth || 800;
          const fitScale = (containerWidth - 48) / viewport.width;
          effectiveScale = scale * Math.min(fitScale, 1.5);
        }

        const scaledViewport = page.getViewport({ scale: effectiveScale });

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * pixelRatio;
        canvas.height = scaledViewport.height * pixelRatio;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;

        // Render text layer for selection
        await renderTextLayer(page, scaledViewport, pageNum);

        renderTasksRef.current.delete(pageNum);
        return true;
      } catch (err) {
        if (err?.name === "RenderingCancelledException") {
          return false;
        }
        console.error(`Error rendering page ${pageNum}:`, err);
        return false;
      }
    },
    [pdfDoc, scale, viewMode, isFullscreen, containerRef, renderTasksRef, renderTextLayer]
  );

  return { renderPageToCanvas };
}

