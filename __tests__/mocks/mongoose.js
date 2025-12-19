import { vi } from "vitest";

// Mock Mongoose connection
export const mockConnectMongo = vi.fn().mockResolvedValue(true);

// Mock Model methods
export const createMockModel = (name, defaultData = {}) => {
  const mockModel = vi.fn().mockImplementation((data) => ({
    ...defaultData,
    ...data,
    _id: data._id || "mock-id-" + Math.random().toString(36).substr(2, 9),
    save: vi.fn().mockResolvedValue({ ...defaultData, ...data }),
    toJSON: vi.fn().mockReturnValue({ ...defaultData, ...data }),
    toObject: vi.fn().mockReturnValue({ ...defaultData, ...data }),
  }));

  // Static methods
  mockModel.find = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    populate: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
    distinct: vi.fn().mockResolvedValue([]),
  });

  mockModel.findOne = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(null),
    populate: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(null),
  });

  mockModel.findById = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(null),
    populate: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(null),
  });

  mockModel.findByIdAndUpdate = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(null),
    exec: vi.fn().mockResolvedValue(null),
  });

  mockModel.findByIdAndDelete = vi.fn().mockResolvedValue(null);
  mockModel.findOneAndUpdate = vi.fn().mockResolvedValue(null);
  mockModel.findOneAndDelete = vi.fn().mockResolvedValue(null);

  mockModel.create = vi.fn().mockImplementation((data) =>
    Promise.resolve({
      ...defaultData,
      ...data,
      _id: "mock-created-id",
      toJSON: () => ({ ...defaultData, ...data, _id: "mock-created-id" }),
    })
  );

  mockModel.insertMany = vi.fn().mockResolvedValue([]);
  mockModel.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
  mockModel.deleteMany = vi.fn().mockResolvedValue({ deletedCount: 0 });
  mockModel.countDocuments = vi.fn().mockResolvedValue(0);
  mockModel.bulkWrite = vi.fn().mockResolvedValue({ modifiedCount: 0 });

  mockModel.modelName = name;

  return mockModel;
};

// Mock User model
export const mockUser = createMockModel("User", {
  name: "Test User",
  email: "test@example.com",
  role: "user",
  hasAccess: false,
  addedBy: [],
});

// Mock Book model
export const mockBook = createMockModel("Book", {
  title: "Test Book",
  author: "Test Author",
  description: "Test Description",
  fileName: "test.pdf",
  filePath: "/uploads/books/test/test.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  uploadedBy: "admin-id",
});

// Mock UserBookAccess model
export const mockUserBookAccess = createMockModel("UserBookAccess", {
  userId: "user-id",
  bookId: "book-id",
  grantedBy: "admin-id",
});

// Mock EmailTemplate model
export const mockEmailTemplate = createMockModel("EmailTemplate", {
  adminId: "admin-id",
  subject: "Test Subject",
  htmlBody: "<p>Test Body</p>",
  textBody: "Test Body",
});

// Mock Lead model
export const mockLead = createMockModel("Lead", {
  email: "lead@example.com",
});

// Helper to reset all mocks
export const resetAllMocks = () => {
  mockConnectMongo.mockClear();
  vi.clearAllMocks();
};

export default {
  mockConnectMongo,
  createMockModel,
  mockUser,
  mockBook,
  mockUserBookAccess,
  mockEmailTemplate,
  mockLead,
  resetAllMocks,
};
