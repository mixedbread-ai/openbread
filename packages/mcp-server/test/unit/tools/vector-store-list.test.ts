import { vectorStoreList } from "../../../src/tools/vector-store-list.js";
import { mockVectorStoreListResponse } from "../../fixtures/mock-responses.js";
import { expectMCPResponse, expectMCPError } from "../../helpers/test-utils.js";

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

  it("should handle list errors gracefully", async () => {
    const error = new Error("API Error: Unauthorized");
    mockList.mockRejectedValue(error);

    const result = await vectorStoreList({ limit: 20 });

    expectMCPError(result);
    expect(result.content[0].text).toContain("Error listing vector stores");
    expect(result.content[0].text).toContain("Unauthorized");
  });
});
