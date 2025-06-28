import {
  VectorStoreCreateSchema,
  VectorStoreDeleteSchema,
  VectorStoreFileRetrieveSchema,
  VectorStoreFileSearchSchema,
  VectorStoreListSchema,
  VectorStoreRetrieveSchema,
  VectorStoreSearchSchema,
  VectorStoreUploadSchema,
} from "../../src/types/schemas.js";

describe("Schema Validation", () => {
  describe("VectorStoreSearchSchema", () => {
    const validInput = {
      query: "test query",
      vector_store_identifiers: ["store1", "store2"],
      top_k: 5,
    };

    it("should validate correct input", () => {
      const result = VectorStoreSearchSchema.parse(validInput);
      expect(result.query).toBe("test query");
      expect(result.vector_store_identifiers).toEqual(["store1", "store2"]);
      expect(result.top_k).toBe(5);
    });

    it("should apply default top_k value", () => {
      const input = {
        query: "test query",
        vector_store_identifiers: ["store1"],
      };
      const result = VectorStoreSearchSchema.parse(input);
      expect(result.top_k).toBe(5);
    });

    it("should reject empty vector_store_identifiers", () => {
      const input = {
        query: "test query",
        vector_store_identifiers: [],
      };
      expect(() => VectorStoreSearchSchema.parse(input)).toThrow();
    });

    it("should reject missing required fields", () => {
      expect(() => VectorStoreSearchSchema.parse({})).toThrow();
    });
  });

  describe("VectorStoreFileSearchSchema", () => {
    const validInput = {
      query: "test query",
      vector_store_identifiers: ["store1"],
    };

    it("should validate correct input with search options", () => {
      const input = {
        ...validInput,
        search_options: {
          return_metadata: true,
          return_chunks: false,
          chunks_per_file: 10,
          rerank: true,
        },
      };
      const result = VectorStoreFileSearchSchema.parse(input);
      expect(result.search_options?.return_metadata).toBe(true);
      expect(result.search_options?.return_chunks).toBe(false);
      expect(result.search_options?.chunks_per_file).toBe(10);
      expect(result.search_options?.rerank).toBe(true);
    });

    it("should apply default return_chunks value", () => {
      const input = {
        ...validInput,
        search_options: {},
      };
      const result = VectorStoreFileSearchSchema.parse(input);
      expect(result.search_options?.return_chunks).toBe(true);
    });
  });

  describe("VectorStoreRetrieveSchema", () => {
    it("should validate correct input", () => {
      const input = { vector_store_id: "vs-123" };
      const result = VectorStoreRetrieveSchema.parse(input);
      expect(result.vector_store_id).toBe("vs-123");
    });

    it("should reject empty vector_store_id", () => {
      const input = { vector_store_id: "" };
      expect(() => VectorStoreRetrieveSchema.parse(input)).toThrow();
    });
  });

  describe("VectorStoreListSchema", () => {
    it("should validate with all optional fields", () => {
      const input = {
        q: "search term",
        limit: 50,
        cursor: "next_page_cursor",
        include_total: true,
      };
      const result = VectorStoreListSchema.parse(input);
      expect(result.q).toBe("search term");
      expect(result.limit).toBe(50);
      expect(result.cursor).toBe("next_page_cursor");
      expect(result.include_total).toBe(true);
    });

    it("should apply default limit value", () => {
      const result = VectorStoreListSchema.parse({});
      expect(result.limit).toBe(20);
    });

    it("should reject limit over 100", () => {
      const input = { limit: 150 };
      expect(() => VectorStoreListSchema.parse(input)).toThrow();
    });

    it("should accept minimal input", () => {
      const result = VectorStoreListSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.q).toBeUndefined();
      expect(result.cursor).toBeUndefined();
      expect(result.include_total).toBeUndefined();
    });

    it("should validate search query", () => {
      const input = { q: "embeddings" };
      const result = VectorStoreListSchema.parse(input);
      expect(result.q).toBe("embeddings");
    });

    it("should validate cursor pagination", () => {
      const input = { cursor: "eyJpZCI6MTIzfQ==" };
      const result = VectorStoreListSchema.parse(input);
      expect(result.cursor).toBe("eyJpZCI6MTIzfQ==");
    });

    it("should validate include_total flag", () => {
      const input = { include_total: false };
      const result = VectorStoreListSchema.parse(input);
      expect(result.include_total).toBe(false);
    });
  });

  describe("VectorStoreCreateSchema", () => {
    it("should validate correct input", () => {
      const input = {
        name: "Test Store",
        description: "A test vector store",
      };
      const result = VectorStoreCreateSchema.parse(input);
      expect(result.name).toBe("Test Store");
      expect(result.description).toBe("A test vector store");
    });

    it("should validate without description", () => {
      const input = { name: "Test Store" };
      const result = VectorStoreCreateSchema.parse(input);
      expect(result.name).toBe("Test Store");
      expect(result.description).toBeUndefined();
    });

    it("should reject empty name", () => {
      const input = { name: "" };
      expect(() => VectorStoreCreateSchema.parse(input)).toThrow();
    });
  });

  describe("VectorStoreDeleteSchema", () => {
    it("should validate correct input", () => {
      const input = { vector_store_id: "vs-123" };
      const result = VectorStoreDeleteSchema.parse(input);
      expect(result.vector_store_id).toBe("vs-123");
    });

    it("should reject empty vector_store_id", () => {
      const input = { vector_store_id: "" };
      expect(() => VectorStoreDeleteSchema.parse(input)).toThrow();
    });
  });

  describe("VectorStoreUploadSchema", () => {
    it("should validate correct input", () => {
      const input = {
        vector_store_id: "vs-123",
        file_path: "/path/to/file.txt",
        filename: "custom-name.txt",
        mime_type: "text/plain",
      };
      const result = VectorStoreUploadSchema.parse(input);
      expect(result.vector_store_id).toBe("vs-123");
      expect(result.file_path).toBe("/path/to/file.txt");
      expect(result.filename).toBe("custom-name.txt");
      expect(result.mime_type).toBe("text/plain");
    });

    it("should validate without optional fields", () => {
      const input = {
        vector_store_id: "vs-123",
        file_path: "/path/to/file.txt",
      };
      const result = VectorStoreUploadSchema.parse(input);
      expect(result.vector_store_id).toBe("vs-123");
      expect(result.file_path).toBe("/path/to/file.txt");
      expect(result.filename).toBeUndefined();
      expect(result.mime_type).toBeUndefined();
    });

    it("should reject empty file_path", () => {
      const input = {
        vector_store_id: "vs-123",
        file_path: "",
      };
      expect(() => VectorStoreUploadSchema.parse(input)).toThrow();
    });
  });

  describe("VectorStoreFileRetrieveSchema", () => {
    it("should validate correct input", () => {
      const input = {
        file_id: "file-123",
        vector_store_identifier: "vs-123",
      };
      const result = VectorStoreFileRetrieveSchema.parse(input);
      expect(result.file_id).toBe("file-123");
      expect(result.vector_store_identifier).toBe("vs-123");
    });

    it("should reject empty file_id", () => {
      const input = {
        file_id: "",
        vector_store_identifier: "vs-123",
      };
      expect(() => VectorStoreFileRetrieveSchema.parse(input)).toThrow();
    });

    it("should reject empty vector_store_identifier", () => {
      const input = {
        file_id: "file-123",
        vector_store_identifier: "",
      };
      expect(() => VectorStoreFileRetrieveSchema.parse(input)).toThrow();
    });
  });
});
