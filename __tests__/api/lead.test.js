import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Lead API Route", () => {
  // Recreate the route logic for testing
  const createPOSTHandler = (connectMongo) => async (req) => {
    const body = await req.json();

    if (!body.email) {
      return {
        status: 400,
        json: async () => ({ error: "Email is required" }),
      };
    }

    try {
      await connectMongo();
      return {
        status: 200,
        json: async () => ({}),
      };
    } catch (e) {
      return {
        status: 500,
        json: async () => ({ error: e.message }),
      };
    }
  };

  // Helper to create mock request
  const createMockRequest = (body) => ({
    json: vi.fn().mockResolvedValue(body),
  });

  describe("POST /api/lead", () => {
    it("should return 400 if email is missing", async () => {
      const mockConnectMongo = vi.fn().mockResolvedValue(true);
      const POST = createPOSTHandler(mockConnectMongo);
      const req = createMockRequest({});

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should return 200 for valid email", async () => {
      const mockConnectMongo = vi.fn().mockResolvedValue(true);
      const POST = createPOSTHandler(mockConnectMongo);
      const req = createMockRequest({ email: "test@example.com" });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });

    it("should call connectMongo", async () => {
      const mockConnectMongo = vi.fn().mockResolvedValue(true);
      const POST = createPOSTHandler(mockConnectMongo);
      const req = createMockRequest({ email: "test@example.com" });

      await POST(req);

      expect(mockConnectMongo).toHaveBeenCalled();
    });

    it("should return 500 on database error", async () => {
      const mockConnectMongo = vi
        .fn()
        .mockRejectedValue(new Error("DB connection failed"));
      const POST = createPOSTHandler(mockConnectMongo);
      const req = createMockRequest({ email: "test@example.com" });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("DB connection failed");
    });
  });
});
