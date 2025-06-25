import { vectorStoreSearch } from "../../../src/tools/vector-store-search.js";
import { mockVectorStoreSearchResponse } from "../../fixtures/mock-responses.js";
import { expectMCPResponse, expectMCPError } from "../../helpers/test-utils.js";

const mockSearch = jest.fn();
const mockClient = {
  vectorStores: {
    search: mockSearch,
  },
};

jest.mock("../../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => mockClient),
}));

describe("vectorStoreSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return search results successfully", async () => {
    mockSearch.mockResolvedValue(mockVectorStoreSearchResponse);

    const args = {
      query: "test query",
      vector_store_identifiers: ["store1", "store2"],
      top_k: 5,
    };

    const result = await vectorStoreSearch(args);

    expect(mockSearch).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("chunk-1");
    expect(result.content[0].text).toContain("sample chunk");
  });

  it("should handle search with optional parameters", async () => {
    mockSearch.mockResolvedValue(mockVectorStoreSearchResponse);

    const args = {
      query: "test query",
      vector_store_identifiers: ["store1"],
      top_k: 10,
      filters: { type: "document" },
      file_ids: ["file1", "file2"],
      search_options: { rerank: true },
    };

    const result = await vectorStoreSearch(args);

    expect(mockSearch).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
  });

  it("should handle API errors gracefully", async () => {
    const error = new Error("API Error: Invalid vector store ID");
    mockSearch.mockRejectedValue(error);

    const args = {
      query: "test query",
      vector_store_identifiers: ["invalid-store"],
      top_k: 5,
    };

    const result = await vectorStoreSearch(args);

    expect(mockSearch).toHaveBeenCalledWith(args);
    expectMCPError(result);
    expect(result.content[0].text).toContain("Error searching vector store");
    expect(result.content[0].text).toContain(
      "API Error: Invalid vector store ID"
    );
  });

  it("should handle non-Error exceptions", async () => {
    mockSearch.mockRejectedValue("String error");

    const args = {
      query: "test query",
      vector_store_identifiers: ["store1"],
      top_k: 5,
    };

    const result = await vectorStoreSearch(args);

    expectMCPError(result);
    expect(result.content[0].text).toContain("String error");
  });
});
