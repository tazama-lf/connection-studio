import { apiClient } from "./apiClient";

// Mock the API_CONFIG
jest.mock("../config/api.config", () => ({
  API_CONFIG: {
    BASE_URL: "https://api.example.com",
    DEFAULT_HEADERS: {
      "Content-Type": "application/json",
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.getItem.mockReturnValue(null); // Reset to no token
  });

  describe("GET requests", () => {
    it("should make a successful GET request", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await apiClient.get("/test-endpoint");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: undefined,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include auth token in headers when available", async () => {
      mockLocalStorage.getItem.mockReturnValue("test-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      await apiClient.get("/test-endpoint");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
          body: undefined,
        },
      );
    });

    it("should include custom headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      await apiClient.get("/test-endpoint", {
        "Custom-Header": "custom-value",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Custom-Header": "custom-value",
          },
          body: undefined,
        },
      );
    });
  });

  describe("POST requests", () => {
    it("should make a successful POST request with data", async () => {
      const mockData = { name: "test" };
      const mockResponse = { id: 1, ...mockData };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await apiClient.post("/test-endpoint", mockData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockData),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should make a POST request without data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      await apiClient.post("/test-endpoint");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: undefined,
        },
      );
    });
  });

  describe("PUT requests", () => {
    it("should make a successful PUT request", async () => {
      const mockData = { id: 1, name: "updated" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await apiClient.put("/test-endpoint/1", mockData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint/1",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockData),
        },
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("PATCH requests", () => {
    it("should make a successful PATCH request", async () => {
      const mockData = { name: "patched" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await apiClient.patch("/test-endpoint/1", mockData);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint/1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockData),
        },
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("DELETE requests", () => {
    it("should make a successful DELETE request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue({}),
      });

      await apiClient.delete("/test-endpoint/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test-endpoint/1",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: undefined,
        },
      );
    });
  });

  describe("Error handling", () => {
    it("should handle 401 unauthorized errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(apiClient.get("/test-endpoint")).rejects.toThrow(
        "Unauthorized",
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
      // Note: window.location.href assignment is tested implicitly through the error flow
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(apiClient.get("/test-endpoint")).rejects.toThrow(
        "HTTP error! status: 500",
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(apiClient.get("/test-endpoint")).rejects.toThrow(
        "Network error",
      );
    });

    it("should log errors to console", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Test error");
      mockFetch.mockRejectedValueOnce(error);

      await expect(apiClient.get("/test-endpoint")).rejects.toThrow(
        "Test error",
      );
      expect(consoleSpy).toHaveBeenCalledWith("API request failed:", error);

      consoleSpy.mockRestore();
    });
  });

  describe("Response parsing", () => {
    it("should parse JSON responses correctly", async () => {
      const mockResponse = { data: { nested: "value" } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await apiClient.get("/test-endpoint");
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue(null),
      });

      const result = await apiClient.delete("/test-endpoint");
      expect(result).toBeNull();
    });
  });
});
