import { storeList } from "../../../src/tools/store-list.js";
import { mockStoreListResponse } from "../../fixtures/mock-responses.js";
import { expectMCPError, expectMCPResponse } from "../../helpers/test-utils.js";

const mockList = jest.fn();
const mockClient = {
  stores: {
    list: mockList,
  },
};

jest.mock("../../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => mockClient),
}));

describe("storeList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should list stores successfully", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const args = { limit: 20 };
    const result = await storeList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
    expect(result.content[0].text).toContain("Store 1");
  });

  it("should list stores with search query", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const args = { q: "embeddings", limit: 10 };
    const result = await storeList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list stores with after cursor", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const args = { after: "next_page_cursor", limit: 20 };
    const result = await storeList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list stores with include_total flag", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const args = { include_total: true, limit: 20 };
    const result = await storeList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should list stores with all optional parameters", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const args = {
      q: "search term",
      limit: 50,
      after: "page_cursor",
      include_total: true,
    };
    const result = await storeList(args);

    expect(mockList).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-1");
  });

  it("should use default limit when not provided", async () => {
    mockList.mockResolvedValue(mockStoreListResponse);

    const result = await storeList({ limit: 20, include_total: true });

    expect(mockList).toHaveBeenCalledWith({ limit: 20, include_total: true });
    expectMCPResponse(result);
  });

  it("should handle list errors gracefully", async () => {
    const error = new Error("API Error: Unauthorized");
    mockList.mockRejectedValue(error);

    const result = await storeList({ limit: 20 });

    expectMCPError(result);
    expect(result.content[0].text).toContain("Error listing stores");
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
