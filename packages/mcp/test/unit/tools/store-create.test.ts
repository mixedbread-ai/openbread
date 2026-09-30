import { storeCreate } from "../../../src/tools/store-create.js";
import { mockStoreCreateResponse } from "../../fixtures/mock-responses.js";
import { expectMCPError, expectMCPResponse } from "../../helpers/test-utils.js";

const mockCreate = jest.fn();
const mockClient = {
  stores: {
    create: mockCreate,
  },
};

jest.mock("../../../src/utils.js", () => ({
  getMixedbreadClient: jest.fn(() => mockClient),
}));

describe("storeCreate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create store successfully", async () => {
    mockCreate.mockResolvedValue(mockStoreCreateResponse);

    const args = { name: "New Store", description: "Test store" };
    const result = await storeCreate(args);

    expect(mockCreate).toHaveBeenCalledWith(args);
    expectMCPResponse(result);
    expect(result.content[0].text).toContain("vs-new");
    expect(result.content[0].text).toContain("New Store");
  });

  it("should handle create errors gracefully", async () => {
    const error = new Error("API Error: Name already exists");
    mockCreate.mockRejectedValue(error);

    const args = { name: "Duplicate Store" };
    const result = await storeCreate(args);

    expectMCPError(result);
    expect(result.content[0].text).toContain("Error creating store");
    expect(result.content[0].text).toContain("Name already exists");
  });
});
