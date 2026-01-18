import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mock functions before vi.mock hoisting
const {
  mockAuth,
  mockConnectMongo,
  mockBookFindById,
  mockReadingAnalyticsInsertMany,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockConnectMongo: vi.fn(),
  mockBookFindById: vi.fn(),
  mockReadingAnalyticsInsertMany: vi.fn(),
}));

// Mock auth
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose connection
vi.mock("@/libs/mongoose", () => ({
  default: mockConnectMongo,
}));

// Mock mongoose
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    Types: {
      ObjectId: vi.fn((id) => ({ toString: () => id })),
      ...actual.Types,
    },
  };
});

// Mock Book model
vi.mock("@/models/Book", () => ({
  default: {
    findById: mockBookFindById,
  },
}));

// Mock ReadingAnalytics model
vi.mock("@/models/ReadingAnalytics", () => ({
  default: {
    insertMany: mockReadingAnalyticsInsertMany,
  },
}));

describe("POST /api/analytics/track", () => {
  const mockBookId = "507f1f77bcf86cd799439011";

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConnectMongo.mockResolvedValue(true);
    mockReadingAnalyticsInsertMany.mockResolvedValue([]);
    
    // Mock mongoose.Types.ObjectId.isValid
    const mongoose = await import("mongoose");
    mongoose.Types.ObjectId.isValid = vi.fn((id) => {
      return id === mockBookId || (typeof id === "string" && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id));
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
      expect(mockConnectMongo).not.toHaveBeenCalled();
    });

    it("should return 401 when session exists but user.id is missing", async () => {
      mockAuth.mockResolvedValue({ user: {} });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should proceed when user is authenticated", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    });

    it("should return 400 when bookId is missing", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          events: [{ eventType: "page_view", locationType: "page", location: "1", sessionId: "session-1" }],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
      expect(mockConnectMongo).not.toHaveBeenCalled();
    });

    it("should return 400 when events is missing", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({ bookId: mockBookId }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Events array is required and must not be empty");
    });

    it("should return 400 when events is not an array", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: "not-an-array",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Events array is required and must not be empty");
    });

    it("should return 400 when events array is empty", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Events array is required and must not be empty");
    });

    it("should return 400 when bookId format is invalid", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "invalid-id",
          events: [{ eventType: "page_view", locationType: "page", location: "1", sessionId: "session-1" }],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid book ID format");
      expect(mockConnectMongo).not.toHaveBeenCalled();
    });
  });

  describe("Book Validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    });

    it("should return 404 when book does not exist", async () => {
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Book not found");
      expect(mockConnectMongo).toHaveBeenCalled();
    });

    it("should proceed when book exists", async () => {
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockBookFindById).toHaveBeenCalledWith(mockBookId);
    });
  });

  describe("Event Validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });
    });

    it("should skip events with invalid eventType", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "invalid_type",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
      expect(mockReadingAnalyticsInsertMany).not.toHaveBeenCalled();
    });

    it("should skip events with missing eventType", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              locationType: "page",
              location: "1",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
    });

    it("should skip events with invalid locationType", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "invalid_location",
              location: "1",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
    });

    it("should skip events with missing locationType", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              location: "1",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
    });

    it("should skip events with missing sessionId", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
    });

    it("should skip events with missing location", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
    });

    it("should accept all valid event types", async () => {
      const validEventTypes = ["page_view", "chapter_view", "session_start", "session_end", "time_update"];
      
      for (const eventType of validEventTypes) {
        vi.clearAllMocks();
        const { POST } = await import("@/app/api/analytics/track/route");
        const req = {
          json: vi.fn().mockResolvedValue({
            bookId: mockBookId,
            events: [
              {
                eventType,
                locationType: "page",
                location: "1",
                sessionId: "session-1",
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        };
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.recordedEvents).toBe(1);
      }
    });

    it("should accept all valid location types", async () => {
      const validLocationTypes = ["page", "chapter", "cfi"];
      
      for (const locationType of validLocationTypes) {
        vi.clearAllMocks();
        const { POST } = await import("@/app/api/analytics/track/route");
        const req = {
          json: vi.fn().mockResolvedValue({
            bookId: mockBookId,
            events: [
              {
                eventType: "page_view",
                locationType,
                location: "1",
                sessionId: "session-1",
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        };
        const response = await POST(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.recordedEvents).toBe(1);
      }
    });
  });

  describe("Event Processing", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });
    });

    it("should successfully record valid events", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recordedEvents).toBe(1);
      expect(mockReadingAnalyticsInsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: "page_view",
            locationType: "page",
            location: "1",
            sessionId: "session-1",
          }),
        ]),
        { ordered: false }
      );
    });

    it("should process multiple valid events", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "chapter_view",
              locationType: "chapter",
              location: "chapter-1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "time_update",
              locationType: "cfi",
              location: "epubcfi(/6/4[chap01ref]!/4/2/2)",
              sessionId: "session-1",
              timeSpent: 30,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(3);
      expect(mockReadingAnalyticsInsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventType: "page_view" }),
          expect.objectContaining({ eventType: "chapter_view" }),
          expect.objectContaining({ eventType: "time_update" }),
        ]),
        { ordered: false }
      );
    });

    it("should filter out invalid events and keep valid ones", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "invalid_type",
              locationType: "page",
              location: "2",
              sessionId: "session-1",
            },
            {
              eventType: "chapter_view",
              locationType: "chapter",
              location: "chapter-1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "page_view",
              locationType: "page",
              sessionId: "session-1",
              // missing location
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(2);
    });

    it("should handle timeSpent correctly", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "time_update",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timeSpent: 45.5,
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "time_update",
              locationType: "page",
              location: "2",
              sessionId: "session-1",
              timeSpent: -10, // negative should become 0
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "time_update",
              locationType: "page",
              location: "3",
              sessionId: "session-1",
              // missing timeSpent should default to 0
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(3);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].timeSpent).toBe(45.5); // Number conversion preserves decimals
      expect(insertCall[1].timeSpent).toBe(0); // negative clamped to 0
      expect(insertCall[2].timeSpent).toBe(0); // missing defaults to 0
    });

    it("should handle sessionStart and sessionEnd dates", async () => {
      const sessionStart = new Date("2024-01-01T10:00:00Z").toISOString();
      const sessionEnd = new Date("2024-01-01T11:00:00Z").toISOString();

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "session_start",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              sessionStart,
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "session_end",
              locationType: "page",
              location: "10",
              sessionId: "session-1",
              sessionEnd,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(2);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].sessionStart).toEqual(new Date(sessionStart));
      expect(insertCall[0].sessionEnd).toBeNull();
      expect(insertCall[1].sessionStart).toBeNull();
      expect(insertCall[1].sessionEnd).toEqual(new Date(sessionEnd));
    });

    it("should handle totalPages and totalChapters", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              totalPages: 100,
              totalChapters: 10,
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "page_view",
              locationType: "page",
              location: "2",
              sessionId: "session-1",
              // missing totalPages and totalChapters should be null
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(2);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].totalPages).toBe(100);
      expect(insertCall[0].totalChapters).toBe(10);
      expect(insertCall[1].totalPages).toBeNull();
      expect(insertCall[1].totalChapters).toBeNull();
    });

    it("should convert location to string", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: 123, // number should be converted to string
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(1);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].location).toBe("123");
    });

    it("should not call insertMany when all events are invalid", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "invalid_type",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
            },
            {
              eventType: "page_view",
              locationType: "invalid_location",
              location: "2",
              sessionId: "session-1",
            },
            {
              eventType: "page_view",
              locationType: "page",
              sessionId: "session-1",
              // missing location
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
      expect(mockReadingAnalyticsInsertMany).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    });

    it("should return 500 and log error when connectMongo fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockConnectMongo.mockRejectedValue(new Error("Database connection failed"));

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record analytics");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Analytics tracking error:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return 500 when Book.findById fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockRejectedValue(new Error("Database query failed")),
      });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record analytics");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return 500 when ReadingAnalytics.insertMany fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });
      mockReadingAnalyticsInsertMany.mockRejectedValue(new Error("Insert failed"));

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record analytics");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return 500 when req.json() fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record analytics");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockBookFindById.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({ _id: mockBookId }),
      });
    });

    it("should handle empty events array after filtering invalid events", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "invalid_type",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(0);
      expect(mockReadingAnalyticsInsertMany).not.toHaveBeenCalled();
    });

    it("should handle mixed valid and invalid events", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "page_view",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
            {
              eventType: "invalid",
              locationType: "page",
              location: "2",
              sessionId: "session-1",
            },
            {
              eventType: "chapter_view",
              locationType: "chapter",
              location: "chapter-1",
              sessionId: "session-1",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(2);
      expect(mockReadingAnalyticsInsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventType: "page_view" }),
          expect.objectContaining({ eventType: "chapter_view" }),
        ]),
        { ordered: false }
      );
    });

    it("should handle very large timeSpent values", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "time_update",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timeSpent: 999999999,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(1);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].timeSpent).toBe(999999999);
    });

    it("should handle string timeSpent values", async () => {
      const { POST } = await import("@/app/api/analytics/track/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: mockBookId,
          events: [
            {
              eventType: "time_update",
              locationType: "page",
              location: "1",
              sessionId: "session-1",
              timeSpent: "45",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recordedEvents).toBe(1);
      
      const insertCall = mockReadingAnalyticsInsertMany.mock.calls[0][0];
      expect(insertCall[0].timeSpent).toBe(45);
    });
  });
});
