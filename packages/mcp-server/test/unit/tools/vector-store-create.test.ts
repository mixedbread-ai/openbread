import { vectorStoreCreate } from "../../../src/tools/vector-store-create.js";
import { mockVectorStoreCreateResponse } from "../../fixtures/mock-responses.js";
import { expectMCPError, expectMCPResponse } from "../../helpers/test-utils.js";

const mockCreate = jest.fn();
const mockClient = {
  vectorStores: {
    create: mockCreate,
  },
};

jest.mock("../../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => mockClient),
}));

describe("vectorStoreCreate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create vector store successfully", async () => {
    mockCreate.mockResolvedValue(mockVectorStoreCreateResponse);

    const args = { name: "New Store", description: "Test store" };
    const result = await vectorStoreCreate(args);

    expect(mockCreate).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-new");
    expect(result.content[0].text).toContain("New Store");
  });

  it("should handle create errors gracefully", async () => {
    const error = new Error("API Error: Name already exists");
    mockCreate.mockRejectedValue(error);

    const args = { name: "Duplicate Store" };
    const result = await vectorStoreCreate(args);

    expectMCPError(result);
    expect(result.content[0].text).toContain("Error creating vector store");
    expect(result.content[0].text).toContain("Name already exists");
  });
});
