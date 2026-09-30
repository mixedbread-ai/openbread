import {
  StoreCreateSchema,
  StoreDeleteSchema,
  StoreFileRetrieveSchema,
  StoreListSchema,
  StoreRetrieveSchema,
  StoreSearchSchema,
  StoreUploadSchema,
} from "../../src/types/schemas.js";

describe("Schema Validation", () => {
  describe("StoreSearchSchema", () => {
    const validInput = {
      query: "test query",
      store_identifiers: ["store1", "store2"],
      top_k: 5,
    };

    it("should validate correct input", () => {
      const result = StoreSearchSchema.parse(validInput);
      expect(result.query).toBe("test query");
      expect(result.store_identifiers).toEqual(["store1", "store2"]);
      expect(result.top_k).toBe(5);
    });

    it("should apply default top_k value", () => {
      const input = {
        query: "test query",
        store_identifiers: ["store1"],
      };
      const result = StoreSearchSchema.parse(input);
      expect(result.top_k).toBe(5);
    });

    it("should reject empty store_identifiers", () => {
      const input = {
        query: "test query",
        store_identifiers: [],
      };
      expect(() => StoreSearchSchema.parse(input)).toThrow();
    });

    it("should reject missing required fields", () => {
      expect(() => StoreSearchSchema.parse({})).toThrow();
    });
  });

  describe("StoreRetrieveSchema", () => {
    it("should validate correct input", () => {
      const input = { store_identifier: "vs-123" };
      const result = StoreRetrieveSchema.parse(input);
      expect(result.store_identifier).toBe("vs-123");
    });

    it("should reject empty store_identifier", () => {
      const input = { store_identifier: "" };
      expect(() => StoreRetrieveSchema.parse(input)).toThrow();
    });
  });

  describe("StoreListSchema", () => {
    it("should validate with all optional fields", () => {
      const input = {
        q: "search term",
        limit: 50,
        after: "next_page_after",
        include_total: true,
      };
      const result = StoreListSchema.parse(input);
      expect(result.q).toBe("search term");
      expect(result.limit).toBe(50);
      expect(result.after).toBe("next_page_after");
      expect(result.include_total).toBe(true);
    });

    it("should apply default limit value", () => {
      const result = StoreListSchema.parse({});
      expect(result.limit).toBe(20);
    });

    it("should reject limit over 100", () => {
      const input = { limit: 150 };
      expect(() => StoreListSchema.parse(input)).toThrow();
    });

    it("should accept minimal input", () => {
      const result = StoreListSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.q).toBeUndefined();
      expect(result.after).toBeUndefined();
      expect(result.include_total).toBeUndefined();
    });

    it("should validate search query", () => {
      const input = { q: "embeddings" };
      const result = StoreListSchema.parse(input);
      expect(result.q).toBe("embeddings");
    });

    it("should validate after pagination", () => {
      const input = { after: "eyJpZCI6MTIzfQ==" };
      const result = StoreListSchema.parse(input);
      expect(result.after).toBe("eyJpZCI6MTIzfQ==");
    });

    it("should validate include_total flag", () => {
      const input = { include_total: false };
      const result = StoreListSchema.parse(input);
      expect(result.include_total).toBe(false);
    });
  });

  describe("StoreCreateSchema", () => {
    it("should validate correct input", () => {
      const input = {
        name: "Test Store",
        description: "A test store",
      };
      const result = StoreCreateSchema.parse(input);
      expect(result.name).toBe("Test Store");
      expect(result.description).toBe("A test store");
    });

    it("should validate without description", () => {
      const input = { name: "Test Store" };
      const result = StoreCreateSchema.parse(input);
      expect(result.name).toBe("Test Store");
      expect(result.description).toBeUndefined();
    });

    it("should reject empty name", () => {
      const input = { name: "" };
      expect(() => StoreCreateSchema.parse(input)).toThrow();
    });
  });

  describe("StoreDeleteSchema", () => {
    it("should validate correct input", () => {
      const input = { store_identifier: "vs-123" };
      const result = StoreDeleteSchema.parse(input);
      expect(result.store_identifier).toBe("vs-123");
    });

    it("should reject empty store_identifier", () => {
      const input = { store_identifier: "" };
      expect(() => StoreDeleteSchema.parse(input)).toThrow();
    });
  });

  describe("StoreUploadSchema", () => {
    it("should validate correct input", () => {
      const input = {
        store_identifier: "vs-123",
        file_path: "/path/to/file.txt",
        filename: "custom-name.txt",
        mime_type: "text/plain",
      };
      const result = StoreUploadSchema.parse(input);
      expect(result.store_identifier).toBe("vs-123");
      expect(result.file_path).toBe("/path/to/file.txt");
      expect(result.filename).toBe("custom-name.txt");
      expect(result.mime_type).toBe("text/plain");
    });

    it("should validate without optional fields", () => {
      const input = {
        store_identifier: "vs-123",
        file_path: "/path/to/file.txt",
      };
      const result = StoreUploadSchema.parse(input);
      expect(result.store_identifier).toBe("vs-123");
      expect(result.file_path).toBe("/path/to/file.txt");
      expect(result.filename).toBeUndefined();
      expect(result.mime_type).toBeUndefined();
    });

    it("should reject empty file_path", () => {
      const input = {
        store_identifier: "vs-123",
        file_path: "",
      };
      expect(() => StoreUploadSchema.parse(input)).toThrow();
    });
  });

  describe("StoreFileRetrieveSchema", () => {
    it("should validate correct input", () => {
      const input = {
        file_id: "file-123",
        store_identifier: "vs-123",
      };
      const result = StoreFileRetrieveSchema.parse(input);
      expect(result.file_id).toBe("file-123");
      expect(result.store_identifier).toBe("vs-123");
    });

    it("should reject empty file_id", () => {
      const input = {
        file_id: "",
        store_identifier: "vs-123",
      };
      expect(() => StoreFileRetrieveSchema.parse(input)).toThrow();
    });

    it("should reject empty store_identifier", () => {
      const input = {
        file_id: "file-123",
        store_identifier: "",
      };
      expect(() => StoreFileRetrieveSchema.parse(input)).toThrow();
    });
  });
});
