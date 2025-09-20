import { dataEnrichmentApi, DataEnrichmentApiService } from "./enrichmentApi";
import { apiClient } from "../../../shared/services/apiClient";

// Mock the apiClient
jest.mock("../../../shared/services/apiClient");
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock API_CONFIG
jest.mock("../../../shared/config/api.config", () => ({
  API_CONFIG: {
    ENDPOINTS: {
      DATA_ENRICHMENT: {
        MAPPINGS: "/api/enrichment/mappings",
        TEMPLATES: "/api/enrichment/templates",
        TRANSFORM: "/api/enrichment/transform",
      },
    },
  },
}));

describe("DataEnrichmentApiService", () => {
  let service: DataEnrichmentApiService;

  beforeEach(() => {
    service = new DataEnrichmentApiService();
    jest.clearAllMocks();
  });

  describe("Mapping Rules", () => {
    describe("getMappingRules", () => {
      it("should fetch all mapping rules", async () => {
        const mockRules = [
          {
            id: "1",
            name: "Test Rule",
            sourceField: "input.field",
            targetField: "output.field",
            transformation: "uppercase",
            isActive: true,
          },
        ];

        mockedApiClient.get.mockResolvedValue(mockRules);

        const result = await service.getMappingRules();

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          "/api/enrichment/mappings",
        );
        expect(result).toEqual(mockRules);
      });

      it("should handle API errors when fetching mapping rules", async () => {
        const error = new Error("API Error");
        mockedApiClient.get.mockRejectedValue(error);

        await expect(service.getMappingRules()).rejects.toThrow("API Error");
      });
    });

    describe("createMappingRule", () => {
      it("should create a new mapping rule", async () => {
        const newRule = {
          name: "New Rule",
          sourceField: "input.newField",
          targetField: "output.newField",
          transformation: "lowercase",
          isActive: true,
        };

        const createdRule = { id: "2", ...newRule };
        mockedApiClient.post.mockResolvedValue(createdRule);

        const result = await service.createMappingRule(newRule);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          "/api/enrichment/mappings",
          newRule,
        );
        expect(result).toEqual(createdRule);
      });

      it("should handle validation errors when creating mapping rule", async () => {
        const invalidRule = {
          name: "",
          sourceField: "input.field",
          targetField: "output.field",
          transformation: "uppercase",
          isActive: true,
        };

        const error = new Error("Validation Error");
        mockedApiClient.post.mockRejectedValue(error);

        await expect(service.createMappingRule(invalidRule)).rejects.toThrow(
          "Validation Error",
        );
      });
    });

    describe("updateMappingRule", () => {
      it("should update an existing mapping rule", async () => {
        const ruleId = "1";
        const updates = { name: "Updated Rule", isActive: false };
        const updatedRule = {
          id: ruleId,
          name: "Updated Rule",
          sourceField: "input.field",
          targetField: "output.field",
          transformation: "uppercase",
          isActive: false,
        };

        mockedApiClient.put.mockResolvedValue(updatedRule);

        const result = await service.updateMappingRule(ruleId, updates);

        expect(mockedApiClient.put).toHaveBeenCalledWith(
          "/api/enrichment/mappings/1",
          updates,
        );
        expect(result).toEqual(updatedRule);
      });
    });

    describe("deleteMappingRule", () => {
      it("should delete a mapping rule", async () => {
        const ruleId = "1";
        mockedApiClient.delete.mockResolvedValue(undefined);

        await service.deleteMappingRule(ruleId);

        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          "/api/enrichment/mappings/1",
        );
      });

      it("should handle errors when deleting mapping rule", async () => {
        const ruleId = "1";
        const error = new Error("Delete Error");
        mockedApiClient.delete.mockRejectedValue(error);

        await expect(service.deleteMappingRule(ruleId)).rejects.toThrow(
          "Delete Error",
        );
      });
    });
  });

  describe("Templates", () => {
    describe("getTemplates", () => {
      it("should fetch all templates", async () => {
        const mockTemplates = [
          {
            id: "1",
            name: "Test Template",
            description: "A test template",
            mappingRules: [],
            createdAt: "2023-01-01T00:00:00Z",
          },
        ];

        mockedApiClient.get.mockResolvedValue(mockTemplates);

        const result = await service.getTemplates();

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          "/api/enrichment/templates",
        );
        expect(result).toEqual(mockTemplates);
      });
    });

    describe("createTemplate", () => {
      it("should create a new template", async () => {
        const newTemplate = {
          name: "New Template",
          description: "A new template",
          mappingRules: [],
        };

        const createdTemplate = {
          id: "2",
          ...newTemplate,
          createdAt: "2023-01-01T00:00:00Z",
        };

        mockedApiClient.post.mockResolvedValue(createdTemplate);

        const result = await service.createTemplate(newTemplate);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          "/api/enrichment/templates",
          newTemplate,
        );
        expect(result).toEqual(createdTemplate);
      });
    });

    describe("updateTemplate", () => {
      it("should update an existing template", async () => {
        const templateId = "1";
        const updates = { name: "Updated Template" };
        const updatedTemplate = {
          id: templateId,
          name: "Updated Template",
          description: "A test template",
          mappingRules: [],
          createdAt: "2023-01-01T00:00:00Z",
        };

        mockedApiClient.put.mockResolvedValue(updatedTemplate);

        const result = await service.updateTemplate(templateId, updates);

        expect(mockedApiClient.put).toHaveBeenCalledWith(
          "/api/enrichment/templates/1",
          updates,
        );
        expect(result).toEqual(updatedTemplate);
      });
    });

    describe("deleteTemplate", () => {
      it("should delete a template", async () => {
        const templateId = "1";
        mockedApiClient.delete.mockResolvedValue(undefined);

        await service.deleteTemplate(templateId);

        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          "/api/enrichment/templates/1",
        );
      });
    });
  });

  describe("Data Transformation", () => {
    describe("transformData", () => {
      it("should transform data using a template", async () => {
        const transformRequest = {
          templateId: "1",
          data: { inputField: "test value" },
        };

        const transformResponse = {
          transformedData: { outputField: "TEST VALUE" },
          appliedRules: ["rule1", "rule2"],
        };

        mockedApiClient.post.mockResolvedValue(transformResponse);

        const result = await service.transformData(transformRequest);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          "/api/enrichment/transform",
          transformRequest,
        );
        expect(result).toEqual(transformResponse);
      });

      it("should handle transformation errors", async () => {
        const transformRequest = {
          templateId: "1",
          data: { inputField: "test value" },
        };

        const transformResponse = {
          transformedData: {},
          appliedRules: [],
          errors: ["Transformation failed"],
        };

        mockedApiClient.post.mockResolvedValue(transformResponse);

        const result = await service.transformData(transformRequest);

        expect(result).toEqual(transformResponse);
        expect(result.errors).toContain("Transformation failed");
      });

      it("should handle API errors during transformation", async () => {
        const transformRequest = {
          templateId: "1",
          data: { inputField: "test value" },
        };

        const error = new Error("Transform API Error");
        mockedApiClient.post.mockRejectedValue(error);

        await expect(service.transformData(transformRequest)).rejects.toThrow(
          "Transform API Error",
        );
      });
    });
  });

  describe("dataEnrichmentApi singleton", () => {
    it("should export a singleton instance", () => {
      expect(dataEnrichmentApi).toBeInstanceOf(DataEnrichmentApiService);
    });

    it("should have all required methods", () => {
      expect(typeof dataEnrichmentApi.getMappingRules).toBe("function");
      expect(typeof dataEnrichmentApi.createMappingRule).toBe("function");
      expect(typeof dataEnrichmentApi.updateMappingRule).toBe("function");
      expect(typeof dataEnrichmentApi.deleteMappingRule).toBe("function");
      expect(typeof dataEnrichmentApi.getTemplates).toBe("function");
      expect(typeof dataEnrichmentApi.createTemplate).toBe("function");
      expect(typeof dataEnrichmentApi.updateTemplate).toBe("function");
      expect(typeof dataEnrichmentApi.deleteTemplate).toBe("function");
      expect(typeof dataEnrichmentApi.transformData).toBe("function");
    });
  });
});
