import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type Mixedbread from "@mixedbread/sdk";
import type { VectorStoreQuestionAnsweringResponse } from "@mixedbread/sdk/resources";
import type { Command } from "commander";
import { createQACommand } from "../../../src/commands/vector-store/qa";
import * as clientUtils from "../../../src/utils/client";
import * as configUtils from "../../../src/utils/config";
import * as outputUtils from "../../../src/utils/output";
import * as vectorStoreUtils from "../../../src/utils/vector-store";

// Mock dependencies
jest.mock("../../../src/utils/client");
jest.mock("../../../src/utils/vector-store");
jest.mock("../../../src/utils/output", () => ({
  ...(jest.requireActual("../../../src/utils/output") as object),
  formatOutput: jest.fn(),
}));
jest.mock("../../../src/utils/config");

// Explicit mock definitions
const mockResolveVectorStore =
  vectorStoreUtils.resolveVectorStore as jest.MockedFunction<
    typeof vectorStoreUtils.resolveVectorStore
  >;
const mockCreateClient = clientUtils.createClient as jest.MockedFunction<
  typeof clientUtils.createClient
>;
const mockLoadConfig = configUtils.loadConfig as jest.MockedFunction<
  typeof configUtils.loadConfig
>;
const mockFormatOutput = outputUtils.formatOutput as jest.MockedFunction<
  typeof outputUtils.formatOutput
>;

describe("QA Command", () => {
  let command: Command;
  let mockClient: {
    vectorStores: {
      questionAnswering: jest.MockedFunction<
        Mixedbread["vectorStores"]["questionAnswering"]
      >;
    };
  };

  beforeEach(() => {
    command = createQACommand();
    mockClient = {
      vectorStores: {
        questionAnswering: jest.fn(),
      },
    };

    // Setup default mocks
    mockCreateClient.mockReturnValue(mockClient as unknown as Mixedbread);
    mockResolveVectorStore.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440090",
      name: "test-store",
      created_at: "2021-01-01",
      updated_at: "2021-01-01",
    });
    mockLoadConfig.mockReturnValue({
      version: "1.0",
      defaults: {
        search: {
          top_k: 5,
        },
      },
    });
    mockFormatOutput.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic question answering", () => {
    const mockQAResponse: VectorStoreQuestionAnsweringResponse = {
      answer:
        "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
      sources: [
        {
          filename: "ml-guide.pdf",
          score: 0.95,
          chunk_index: 2,
          metadata: { chapter: "Introduction" },
          file_id: "123",
          vector_store_id: "456",
          type: "text",
          text: "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
        },
        {
          filename: "ai-overview.txt",
          score: 0.87,
          chunk_index: 0,
          metadata: { section: "Definitions" },
          file_id: "123",
          vector_store_id: "456",
          type: "text",
          text: "Artificial intelligence (AI) is the simulation of human intelligence in machines that are programmed to think like humans and mimic their actions.",
        },
      ],
    };

    it("should ask question with default options", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        mockQAResponse
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is machine learning?",
      ]);

      expect(mockResolveVectorStore).toHaveBeenCalledWith(
        expect.objectContaining({
          vectorStores: expect.any(Object),
        }),
        "test-store"
      );
      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith({
        query: "What is machine learning?",
        vector_store_identifiers: ["550e8400-e29b-41d4-a716-446655440090"],
        top_k: 5,
        search_options: {
          score_threshold: undefined,
          return_metadata: undefined,
        },
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Answer:")
      );
      expect(console.log).toHaveBeenCalledWith(mockQAResponse.answer);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Sources:")
      );

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filename: "ml-guide.pdf",
            score: "0.95",
            chunk_index: 2,
          }),
          expect.objectContaining({
            filename: "ai-overview.txt",
            score: "0.87",
            chunk_index: 0,
          }),
        ]),
        undefined
      );
    });

    it("should ask question with custom top-k", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        mockQAResponse
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is AI?",
        "--top-k",
        "15",
      ]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 15,
        })
      );
    });

    it("should ask question with threshold", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        mockQAResponse
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is AI?",
        "--threshold",
        "0.8",
      ]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          search_options: expect.objectContaining({
            score_threshold: 0.8,
          }),
        })
      );
    });

    it("should ask question with return metadata enabled", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        mockQAResponse
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is AI?",
        "--return-metadata",
      ]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          search_options: expect.objectContaining({
            return_metadata: true,
          }),
        })
      );

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(formattedData?.[0]).toHaveProperty("metadata");
    });

    it("should handle response without sources", async () => {
      const responseWithoutSources = {
        answer:
          "I could not find specific information to answer your question.",
        sources: [],
      };

      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        responseWithoutSources
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is quantum computing?",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Answer:")
      );
      expect(console.log).toHaveBeenCalledWith(responseWithoutSources.answer);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Sources:")
      );
      expect(mockFormatOutput).not.toHaveBeenCalled();
    });

    it("should handle response with undefined sources", async () => {
      const responseWithUndefinedSources = {
        answer: "The answer to your question.",
      };

      mockClient.vectorStores.questionAnswering.mockResolvedValue(
        responseWithUndefinedSources
      );

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "What is the answer?",
      ]);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Answer:")
      );
      expect(console.log).toHaveBeenCalledWith(
        responseWithUndefinedSources.answer
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Sources:")
      );
      expect(mockFormatOutput).not.toHaveBeenCalled();
    });
  });

  describe("Output formatting", () => {
    const mockResponse: VectorStoreQuestionAnsweringResponse = {
      answer: "Test answer",
      sources: [
        {
          filename: "test.pdf",
          score: 0.9,
          chunk_index: 1,
          metadata: { key: "value" },
          file_id: "123",
          vector_store_id: "456",
          type: "text",
          text: "Test text",
        },
      ],
    };

    it("should format sources as table by default", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.any(Array),
        undefined
      );
    });

    it("should format sources as JSON when specified", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--format",
        "json",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "json");
    });

    it("should format sources as CSV when specified", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--format",
        "csv",
      ]);

      expect(mockFormatOutput).toHaveBeenCalledWith(expect.any(Array), "csv");
    });

    it("should format metadata correctly for table output", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--return-metadata",
      ]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(typeof formattedData?.[0].metadata).toBe("object");
      expect(formattedData?.[0].metadata).toEqual({ key: "value" });
    });

    it("should format metadata as object for non-table output", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--return-metadata",
        "--format",
        "json",
      ]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(typeof formattedData?.[0].metadata).toBe("object");
      expect(formattedData?.[0].metadata).toEqual({ key: "value" });
    });

    it("should not include metadata in output when not requested", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      const formattedData = mockFormatOutput.mock.calls[0]?.[0];
      expect(formattedData?.[0]).not.toHaveProperty("metadata");
    });
  });

  describe("Validation", () => {
    it("should validate required name-or-id argument", async () => {
      await command.parseAsync(["node", "qa", "", "question"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"name-or-id" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate required question argument", async () => {
      await command.parseAsync(["node", "qa", "test-store", ""]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"question" is required')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k is positive", async () => {
      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--top-k",
        "-5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be positive')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k is an integer", async () => {
      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--top-k",
        "5.5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be an integer')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate top-k maximum value", async () => {
      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--top-k",
        "150",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"top-k" must be less than or equal to 100')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate threshold minimum value", async () => {
      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--threshold",
        "-0.1",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(
          '"threshold" must be greater than or equal to 0'
        )
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should validate threshold maximum value", async () => {
      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--threshold",
        "1.5",
      ]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"threshold" must be less than or equal to 1')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Error handling", () => {
    it("should handle QA API errors", async () => {
      const error = new Error("API Error: Service unavailable");
      mockClient.vectorStores.questionAnswering.mockRejectedValue(error);

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "API Error: Service unavailable"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle store resolution errors", async () => {
      const error = new Error("Store not found");
      mockResolveVectorStore.mockRejectedValue(error);

      await command.parseAsync(["node", "qa", "nonexistent-store", "question"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Store not found"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error rejections", async () => {
      mockClient.vectorStores.questionAnswering.mockRejectedValue(
        "Unknown error"
      );

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        "Failed to process question"
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Global options", () => {
    const mockResponse: VectorStoreQuestionAnsweringResponse = {
      answer: "Test answer",
      sources: [
        {
          filename: "test.pdf",
          score: 0.9,
          chunk_index: 1,
          metadata: {},
          file_id: "123",
          vector_store_id: "456",
          type: "text",
          text: "Test text",
        },
      ],
    };

    it("should support API key option", async () => {
      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--api-key",
        "mxb_test123",
      ]);

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "mxb_test123",
        })
      );
    });
  });

  describe("Config defaults", () => {
    const mockResponse = {
      answer: "Test answer",
      sources: [],
    };

    it("should use config defaults when options not provided", async () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        defaults: {
          search: {
            top_k: 12,
          },
        },
      });

      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 12,
        })
      );
    });

    it("should override config defaults with command options", async () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
        defaults: {
          search: {
            top_k: 12,
          },
        },
      });

      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "question",
        "--top-k",
        "25",
      ]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 25,
        })
      );
    });

    it("should use fallback defaults when config is empty", async () => {
      mockLoadConfig.mockReturnValue({
        version: "1.0",
      });

      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync(["node", "qa", "test-store", "question"]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          top_k: 10, // Fallback default
        })
      );
    });
  });

  describe("Complex scenarios", () => {
    it("should handle all options together", async () => {
      const mockResponse: VectorStoreQuestionAnsweringResponse = {
        answer: "Complex answer with all options",
        sources: [
          {
            filename: "complex.pdf",
            score: 0.95,
            chunk_index: 5,
            metadata: { complexity: "high", topic: "advanced" },
            file_id: "123",
            vector_store_id: "456",
            type: "text",
            text: "Test text",
          },
        ],
      };

      mockClient.vectorStores.questionAnswering.mockResolvedValue(mockResponse);

      await command.parseAsync([
        "node",
        "qa",
        "test-store",
        "Complex question?",
        "--top-k",
        "20",
        "--threshold",
        "0.75",
        "--return-metadata",
        "--format",
        "json",
      ]);

      expect(mockClient.vectorStores.questionAnswering).toHaveBeenCalledWith({
        query: "Complex question?",
        vector_store_identifiers: ["550e8400-e29b-41d4-a716-446655440090"],
        top_k: 20,
        search_options: {
          score_threshold: 0.75,
          return_metadata: true,
        },
      });

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filename: "complex.pdf",
            score: "0.95",
            chunk_index: 5,
            metadata: mockResponse.sources?.[0]?.metadata,
          }),
        ]),
        "json"
      );
    });
  });
});
