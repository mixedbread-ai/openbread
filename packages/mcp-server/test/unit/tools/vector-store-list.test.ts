import { vectorStoreList } from "../../../src/tools/vector-store-list.js";
import { mockVectorStoreListResponse } from "../../fixtures/mock-responses.js";
import { expectMCPError, expectMCPResponse } from "../../helpers/test-utils.js";

const mockList = jest.fn();
const mockClient = {
  vectorStores: {
    list: mockList,
  },
};

jest.mock("../../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => mockClient),
}));

describe("vectorStoreList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list vector stores successfully", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const args = { limit: 20 };
    const result = await vectorStoreList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
    expect(result.content[0].text).toContain("Store 1");
  });

  it("should list vector stores with search query", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const args = { q: "embeddings", limit: 10 };
    const result = await vectorStoreList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list vector stores with cursor pagination", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const args = { cursor: "next_page_cursor", limit: 20 };
    const result = await vectorStoreList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list vector stores with include_total flag", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const args = { include_total: true, limit: 20 };
    const result = await vectorStoreList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list vector stores with all optional parameters", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const args = {
      q: "search term",
      limit: 50,
      cursor: "page_cursor",
      include_total: true,
    };
    const result = await vectorStoreList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should use default limit when not provided", async () => {
    mockList.mockResolvedValue(mockVectorStoreListResponse);

    const result = await vectorStoreList({ limit: 20, include_total: true });

    expect(mockList).toHaveBeenCalledWith({ limit: 20, include_total: true });
    expectMCPResponse(result);
  });

  it("should handle list errors gracefully", async () => {
    const error = new Error("API Error: Unauthorized");
    mockList.mockRejectedValue(error);

    const result = await vectorStoreList({ limit: 20 });

    expectMCPError(result);
    expect(result.content[0].text).toContain("Error listing vector stores");
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
