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
}) {
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
      } catch (err) {
        console.error(`Error rendering text layer for page ${pageNum}:`, err);
      }
    },
    [pdfjsLibRef, textLayerRefs]
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

