"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/libs/api";
import icons from "@/libs/icons";

// Font family options
const FONT_FAMILIES = [
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Arial", label: "Arial" },
  { value: "Verdana", label: "Verdana" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Palatino", label: "Palatino" },
  { value: "Garamond", label: "Garamond" },
  { value: "Book Antiqua", label: "Book Antiqua" },
  { value: "Courier New", label: "Courier New" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
];

// Default settings
const DEFAULT_SETTINGS = {
  fontFamily: "Georgia",
  fontSize: 16,
  spacing: "normal",
  alignment: "justify",
  margins: "normal",
  spread: "always",
};

/**
 * OptionButton - Reusable button for layout options with visual indicator
 */
function OptionButton({ isSelected, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 border-2 rounded-lg transition-all ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-base-300 hover:border-base-content/30"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * SpacingIcon - Visual indicator for spacing options
 */
function SpacingIcon({ type }) {
  const lineGap = type === "narrow" ? 1 : type === "normal" ? 2 : 3;
  return (
    <div className="flex flex-col items-center justify-center h-12 w-full">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-full h-0.5 bg-current"
          style={{ marginBottom: i < 2 ? `${lineGap * 3}px` : 0 }}
        />
      ))}
    </div>
  );
}

/**
 * AlignmentIcon - Visual indicator for alignment options
 */
function AlignmentIcon({ type }) {
  const widths =
    type === "left" ? ["100%", "75%", "85%"] : ["100%", "100%", "100%"];
  return (
    <div className="flex flex-col items-start justify-center h-12 w-full gap-1.5">
      {widths.map((w, i) => (
        <div key={i} className="h-0.5 bg-current" style={{ width: w }} />
      ))}
    </div>
  );
}

/**
 * MarginsIcon - Visual indicator for margins options
 */
function MarginsIcon({ type }) {
  const padding = type === "narrow" ? 2 : type === "normal" ? 4 : 8;
  return (
    <div
      className="flex flex-col items-center justify-center h-12 w-full border border-current rounded"
      style={{ padding: `${padding}px` }}
    >
      <div className="w-full h-0.5 bg-current mb-1.5" />
      <div className="w-full h-0.5 bg-current mb-1.5" />
      <div className="w-3/4 h-0.5 bg-current" />
    </div>
  );
}

/**
 * ColumnsIcon - Visual indicator for column layout options
 */
function ColumnsIcon({ type }) {
  const isSingleColumn = type === "none";
  return (
    <div className="flex items-center justify-center h-12 w-full gap-1">
      {isSingleColumn ? (
        // Single column
        <div className="w-8 h-10 border border-current rounded flex flex-col justify-center items-center p-1">
          <div className="w-full h-0.5 bg-current mb-1" />
          <div className="w-full h-0.5 bg-current mb-1" />
          <div className="w-full h-0.5 bg-current mb-1" />
          <div className="w-3/4 h-0.5 bg-current" />
        </div>
      ) : (
        // Two columns
        <>
          <div className="w-6 h-10 border border-current rounded flex flex-col justify-center items-center p-0.5">
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-3/4 h-0.5 bg-current" />
          </div>
          <div className="w-6 h-10 border border-current rounded flex flex-col justify-center items-center p-0.5">
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-full h-0.5 bg-current mb-0.5" />
            <div className="w-3/4 h-0.5 bg-current" />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * PageViewSettingsSidebar - Sidebar for configuring page view settings
 * Includes Font and Layout tabs with various customization options
 */
export default function PageViewSettingsSidebar({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) {
  const [activeTab, setActiveTab] = useState("font");
  const [localSettings, setLocalSettings] = useState(
    settings || DEFAULT_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(false);
  const sidebarRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Sync local settings with props
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isOpen) return;

      // Don't close if clicking on toolbar buttons
      if (event.target.closest(".toolbar")) return;

      // Check if click is outside the sidebar
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Save settings to API (debounced)
  const saveSettings = useCallback(async (newSettings) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiClient.put("/user/preferences", {
          pageViewSettings: newSettings,
        });
      } catch (error) {
        console.error("Failed to save page view settings:", error);
      }
    }, 500);
  }, []);

  // Handle setting change
  const handleSettingChange = useCallback(
    (key, value) => {
      const newSettings = { ...localSettings, [key]: value };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
      saveSettings(newSettings);
    },
    [localSettings, onSettingsChange, saveSettings]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={sidebarRef}
      data-sidebar="settings"
      className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-base-300">
        <h3 className="text-lg font-semibold">Page View Settings</h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
          {icons.close}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex tabs border-b border-base-300">
        <button
          onClick={() => setActiveTab("font")}
          className={`flex-1 tab text-sm font-medium py-3 ${
            activeTab === "font"
              ? "text-primary tab-active border-b-2 border-primary"
              : "text-base-content/60"
          }`}
        >
          Font
        </button>
        <button
          onClick={() => setActiveTab("layout")}
          className={`flex-1 tab text-sm font-medium py-3 ${
            activeTab === "layout"
              ? "text-primary tab-active border-b-2 border-primary"
              : "text-base-content/60"
          }`}
        >
          Layout
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-6">
        {activeTab === "font" ? (
          <>
            {/* Font Family */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">
                Font Family
              </label>
              <select
                value={localSettings.fontFamily}
                onChange={(e) =>
                  handleSettingChange("fontFamily", e.target.value)
                }
                className="select select-bordered w-full"
                style={{ fontFamily: localSettings.fontFamily }}
              >
                {FONT_FAMILIES.map((font) => (
                  <option
                    key={font.value}
                    value={font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">
                Font Size
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    handleSettingChange(
                      "fontSize",
                      Math.max(12, localSettings.fontSize - 1)
                    )
                  }
                  disabled={localSettings.fontSize <= 12}
                  className="btn btn-ghost btn-sm btn-square"
                >
                  {icons.minus}
                </button>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={localSettings.fontSize}
                  onChange={(e) =>
                    handleSettingChange("fontSize", parseInt(e.target.value))
                  }
                  className="range range-primary flex-1"
                />
                <button
                  onClick={() =>
                    handleSettingChange(
                      "fontSize",
                      Math.min(24, localSettings.fontSize + 1)
                    )
                  }
                  disabled={localSettings.fontSize >= 24}
                  className="btn btn-ghost btn-sm btn-square"
                >
                  {icons.plus}
                </button>
              </div>
              <div className="text-center text-sm text-base-content/60">
                {localSettings.fontSize}px
              </div>
            </div>

            {/* Font Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">
                Preview
              </label>
              <div
                className="p-4 border border-base-300 rounded-lg"
                style={{
                  fontFamily: localSettings.fontFamily,
                  fontSize: `${localSettings.fontSize}px`,
                }}
              >
                The quick brown fox jumps over the lazy dog.
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Spacing */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-base-content/70">
                Spacing
              </label>
              <div className="flex gap-3">
                {["narrow", "normal", "wide"].map((option) => (
                  <OptionButton
                    key={option}
                    isSelected={localSettings.spacing === option}
                    onClick={() => handleSettingChange("spacing", option)}
                    title={`${
                      option.charAt(0).toUpperCase() + option.slice(1)
                    } spacing`}
                  >
                    <SpacingIcon type={option} />
                  </OptionButton>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-base-content/70">
                Alignment
              </label>
              <div className="flex gap-3">
                {["left", "justify"].map((option) => (
                  <OptionButton
                    key={option}
                    isSelected={localSettings.alignment === option}
                    onClick={() => handleSettingChange("alignment", option)}
                    title={`${
                      option.charAt(0).toUpperCase() + option.slice(1)
                    } alignment`}
                  >
                    <AlignmentIcon type={option} />
                  </OptionButton>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-base-content/70">
                Margins
              </label>
              <div className="flex gap-3">
                {["narrow", "normal", "wide"].map((option) => (
                  <OptionButton
                    key={option}
                    isSelected={localSettings.margins === option}
                    onClick={() => handleSettingChange("margins", option)}
                    title={`${
                      option.charAt(0).toUpperCase() + option.slice(1)
                    } margins`}
                  >
                    <MarginsIcon type={option} />
                  </OptionButton>
                ))}
              </div>
            </div>

            {/* Columns */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-base-content/70">
                Columns
              </label>
              <div className="flex gap-3">
                <OptionButton
                  isSelected={localSettings.spread === "none"}
                  onClick={() => handleSettingChange("spread", "none")}
                  title="Single column"
                >
                  <ColumnsIcon type="none" />
                  <div className="text-xs mt-1">1 Column</div>
                </OptionButton>
                <OptionButton
                  isSelected={localSettings.spread === "always"}
                  onClick={() => handleSettingChange("spread", "always")}
                  title="Two columns"
                >
                  <ColumnsIcon type="always" />
                  <div className="text-xs mt-1">2 Columns</div>
                </OptionButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
