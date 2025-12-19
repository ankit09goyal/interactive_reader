import { vi } from "vitest";

// Mock file system operations
export const mockFsPromises = {
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("test content")),
  unlink: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
  }),
  access: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  rm: vi.fn().mockResolvedValue(undefined),
};

// Mock fs module
export const mockFs = {
  promises: mockFsPromises,
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("test content")),
  unlinkSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
  }),
  readdirSync: vi.fn().mockReturnValue([]),
};

// Mock File object for uploads
export const createMockFile = (options = {}) => {
  const {
    name = "test.pdf",
    type = "application/pdf",
    size = 1024,
    content = "test content",
  } = options;

  return {
    name,
    type,
    size,
    arrayBuffer: vi.fn().mockResolvedValue(Buffer.from(content)),
    text: vi.fn().mockResolvedValue(content),
    stream: vi.fn(),
    slice: vi.fn(),
  };
};

// Mock FormData
export const createMockFormData = (fields = {}) => {
  const formData = new Map();

  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return {
    get: (key) => formData.get(key) || null,
    getAll: (key) => (formData.has(key) ? [formData.get(key)] : []),
    has: (key) => formData.has(key),
    entries: () => formData.entries(),
    keys: () => formData.keys(),
    values: () => formData.values(),
    append: (key, value) => formData.set(key, value),
    delete: (key) => formData.delete(key),
    set: (key, value) => formData.set(key, value),
  };
};

// Helper to reset all mocks
export const resetFsMocks = () => {
  Object.values(mockFsPromises).forEach((mock) => mock.mockClear());
  Object.values(mockFs).forEach((mock) => {
    if (typeof mock.mockClear === "function") {
      mock.mockClear();
    }
  });
};

export default {
  mockFs,
  mockFsPromises,
  createMockFile,
  createMockFormData,
  resetFsMocks,
};
