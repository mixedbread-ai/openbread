import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  createCompletionCommand,
  createCompletionServerCommand,
} from "../../src/commands/completion";
import { mockConsole, parseCommand } from "../helpers/test-utils";

// Mock @pnpm/tabtab
jest.mock("@pnpm/tabtab", () => ({
  install: jest.fn(),
  uninstall: jest.fn(),
  parseEnv: jest.fn(),
  log: jest.fn(),
  getShellFromEnv: jest.fn(),
}));

// Mock chalk
jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    green: jest.fn((text) => `GREEN:${text}`),
    yellow: jest.fn((text) => `YELLOW:${text}`),
    red: jest.fn((text) => `RED:${text}`),
    cyan: jest.fn((text) => `CYAN:${text}`),
    bold: jest.fn((text) => `BOLD:${text}`),
    dim: jest.fn((text) => `DIM:${text}`),
    gray: jest.fn((text) => `GRAY:${text}`),
  },
}));

// Mock completion-cache module
jest.mock("../../src/utils/completion-cache", () => ({
  getCurrentKeyName: jest.fn(() => "test-key"),
  getStoresForCompletion: jest.fn(() => ["store1", "store2"]),
  refreshAllCaches: jest.fn(() => Promise.resolve()),
  refreshCacheForKey: jest.fn(() => Promise.resolve()),
  updateCacheAfterCreate: jest.fn(),
  updateCacheAfterUpdate: jest.fn(),
  updateCacheAfterDelete: jest.fn(),
  clearCacheForKey: jest.fn(),
}));

// Mock path module
jest.mock("node:path", () => ({
  basename: jest.fn((path: string) => path.split("/").pop()),
  join: jest.fn((...args: string[]) => args.join("/")),
}));

describe("Completion Commands", () => {
  let mockConsoleOutput: ReturnType<typeof mockConsole>;
  let originalShell: string | undefined;
  let mockInstall: jest.MockedFunction<typeof import("@pnpm/tabtab").install>;
  let mockUninstall: jest.MockedFunction<
    typeof import("@pnpm/tabtab").uninstall
  >;
  let mockParseEnv: jest.MockedFunction<typeof import("@pnpm/tabtab").parseEnv>;
  let mockLog: jest.MockedFunction<typeof import("@pnpm/tabtab").log>;
  let mockGetShellFromEnv: jest.MockedFunction<
    typeof import("@pnpm/tabtab").getShellFromEnv
  >;

  beforeEach(() => {
    mockConsoleOutput = mockConsole();
    originalShell = process.env.SHELL;

    // Get mocked functions
    const tabtab = jest.mocked(require("@pnpm/tabtab"));
    mockInstall = tabtab.install as jest.MockedFunction<
      typeof import("@pnpm/tabtab").install
    >;
    mockUninstall = tabtab.uninstall as jest.MockedFunction<
      typeof import("@pnpm/tabtab").uninstall
    >;
    mockParseEnv = tabtab.parseEnv as jest.MockedFunction<
      typeof import("@pnpm/tabtab").parseEnv
    >;
    mockLog = tabtab.log as jest.MockedFunction<
      typeof import("@pnpm/tabtab").log
    >;
    mockGetShellFromEnv = tabtab.getShellFromEnv as jest.MockedFunction<
      typeof import("@pnpm/tabtab").getShellFromEnv
    >;

    // Reset all mocks
    jest.clearAllMocks();

    // Set default shell
    process.env.SHELL = "/bin/bash";

    // Default mock implementations
    mockInstall.mockResolvedValue(undefined);
    mockUninstall.mockResolvedValue(undefined);
    mockParseEnv.mockReturnValue({
      complete: false,
      words: 0,
      point: 0,
      line: "",
      partial: "",
      last: "",
      lastPartial: "",
      prev: "",
    });
    mockGetShellFromEnv.mockReturnValue("bash");
  });

  afterEach(() => {
    mockConsoleOutput.restore();
    process.env.SHELL = originalShell;
  });

  describe("createCompletionCommand", () => {
    describe("command structure", () => {
      it("should create completion command with correct name and description", () => {
        const command = createCompletionCommand();

        expect(command.name()).toBe("completion");
        expect(command.description()).toBe("Manage shell completion");
      });

      it("should have install, uninstall, and refresh subcommands", () => {
        const command = createCompletionCommand();
        const subcommands = command.commands;

        expect(subcommands).toHaveLength(3);
        expect(subcommands.map((cmd) => cmd.name())).toContain("install");
        expect(subcommands.map((cmd) => cmd.name())).toContain("uninstall");
        expect(subcommands.map((cmd) => cmd.name())).toContain("refresh");
      });

      it("should show help when no subcommand is provided", async () => {
        const command = createCompletionCommand();
        const helpSpy = jest.spyOn(command, "help").mockImplementation(() => {
          // help() method doesn't return a value, it just outputs help
          return undefined as never;
        });

        await parseCommand(command, []);

        expect(helpSpy).toHaveBeenCalled();
      });
    });

    describe("install subcommand", () => {
      describe("successful installation", () => {
        it("should install completion with auto-detected bash shell", async () => {
          process.env.SHELL = "/bin/bash";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
            shell: "bash",
          });

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("Shell completion installed for")
          );
          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("source ~/.bashrc")
          );
        });

        it("should install completion with auto-detected zsh shell", async () => {
          process.env.SHELL = "/usr/local/bin/zsh";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
            shell: "zsh",
          });

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("Shell completion installed for")
          );
          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("source ~/.zshrc")
          );
        });

        it("should install completion with manually specified shell", async () => {
          const command = createCompletionCommand();
          await parseCommand(command, ["install", "--shell", "fish"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
            shell: "fish",
          });

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("Shell completion installed for")
          );
          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("fish auto-loads completions")
          );
        });

        it("should show auto-detected indicator in success message", async () => {
          process.env.SHELL = "/bin/bash";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("auto-detected")
          );
        });

        it("should not show auto-detected indicator for manual shell", async () => {
          const command = createCompletionCommand();
          await parseCommand(command, ["install", "--shell", "bash"]);

          const successMessage = mockConsoleOutput.logs.find((log) =>
            log.includes("Shell completion installed for")
          );
          expect(successMessage).not.toContain("auto-detected");
        });
      });

      describe("shell-specific instructions", () => {
        const shellInstructions = [
          { shell: "bash", instruction: "source ~/.bashrc" },
          { shell: "zsh", instruction: "source ~/.zshrc" },
          { shell: "fish", instruction: "fish auto-loads completions" },
          { shell: "pwsh", instruction: ". $PROFILE" },
        ];

        shellInstructions.forEach(({ shell, instruction }) => {
          it(`should show correct instructions for ${shell}`, async () => {
            const command = createCompletionCommand();
            await parseCommand(command, ["install", "--shell", shell]);

            expect(mockConsoleOutput.logs).toContainEqual(
              expect.stringContaining(instruction)
            );
          });
        });
      });

      describe("error handling", () => {
        it("should show error for unsupported shell", async () => {
          const command = createCompletionCommand();
          const result = await parseCommand(command, [
            "install",
            "--shell",
            "unsupported",
          ]);

          expect(result.exitCode).toBe(1);
          expect(mockConsoleOutput.errors).toContainEqual(
            expect.stringContaining("Unsupported shell 'unsupported'")
          );
          expect(mockConsoleOutput.errors).toContainEqual(
            expect.stringContaining("Supported shells: bash, zsh, fish, pwsh")
          );
        });

        it("should handle installation errors gracefully", async () => {
          const errorMessage = "Installation failed";
          mockInstall.mockRejectedValueOnce(new Error(errorMessage));

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockConsoleOutput.errors).toContainEqual(
            expect.stringContaining("Error installing completion")
          );
        });

        it("should handle shell auto-detection failure", async () => {
          process.env.SHELL = undefined;

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
          });

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("Could not auto-detect shell")
          );
        });

        it("should handle unsupported detected shell", async () => {
          process.env.SHELL = "/bin/tcsh";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
          });

          expect(mockConsoleOutput.logs).toContainEqual(
            expect.stringContaining("Could not auto-detect shell")
          );
        });
      });

      describe("edge cases", () => {
        it("should handle empty SHELL environment variable", async () => {
          process.env.SHELL = "";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
          });
        });

        it("should handle SHELL with path components", async () => {
          process.env.SHELL = "/usr/local/bin/zsh";

          const command = createCompletionCommand();
          await parseCommand(command, ["install"]);

          expect(mockInstall).toHaveBeenCalledWith({
            name: "mxbai",
            completer: "mxbai",
            shell: "zsh",
          });
        });
      });
    });

    describe("uninstall subcommand", () => {
      it("should uninstall completion successfully", async () => {
        const command = createCompletionCommand();
        await parseCommand(command, ["uninstall"]);

        expect(mockUninstall).toHaveBeenCalledWith({ name: "mxbai" });
        expect(mockConsoleOutput.logs).toContainEqual(
          expect.stringContaining("Shell completion uninstalled for")
        );
      });

      it("should handle uninstall errors gracefully", async () => {
        const errorMessage = "Uninstall failed";
        mockUninstall.mockRejectedValueOnce(new Error(errorMessage));

        const command = createCompletionCommand();
        await parseCommand(command, ["uninstall"]);

        expect(mockConsoleOutput.errors).toContainEqual(
          expect.stringContaining("Error uninstalling completion")
        );
      });
    });

    describe("refresh subcommand", () => {
      let mockRefreshAllCaches: jest.MockedFunction<
        typeof import("../../src/utils/completion-cache").refreshAllCaches
      >;

      beforeEach(() => {
        const completionCache = jest.mocked(
          require("../../src/utils/completion-cache")
        );
        mockRefreshAllCaches = completionCache.refreshAllCaches;
      });

      it("should refresh completion cache successfully", async () => {
        mockRefreshAllCaches.mockResolvedValue(undefined);

        const command = createCompletionCommand();
        await parseCommand(command, ["refresh"]);

        expect(mockRefreshAllCaches).toHaveBeenCalled();
        expect(mockConsoleOutput.logs).toContainEqual(
          expect.stringContaining("Completion cache refreshed successfully")
        );
      });

      it("should handle refresh errors gracefully", async () => {
        const errorMessage = "No API keys found";
        mockRefreshAllCaches.mockRejectedValue(new Error(errorMessage));

        const command = createCompletionCommand();
        await parseCommand(command, ["refresh"]);

        expect(mockConsoleOutput.logs).toContainEqual(
          expect.stringContaining(errorMessage)
        );
      });

      it("should have global options", () => {
        const command = createCompletionCommand();
        const refreshCommand = command.commands.find(
          (cmd) => cmd.name() === "refresh"
        );

        expect(refreshCommand).toBeDefined();
        const options = refreshCommand?.options;
        expect(options).toBeDefined();

        const hasBaseURLOption = options?.some(
          (opt) => opt.long === "--base-url"
        );
        expect(hasBaseURLOption).toBe(true);
      });
    });
  });

  describe("createCompletionServerCommand", () => {
    describe("command structure", () => {
      it("should create completion server command with correct configuration", async () => {
        const command = createCompletionServerCommand();

        expect(command.name()).toBe("completion-server");
        expect(command.description()).toBe("Internal completion server");

        // Test that the command accepts unknown options and excess arguments
        // by verifying it doesn't exit with error for unknown options
        const result = await parseCommand(command, [
          "--unknown-option",
          "extra-arg",
        ]);
        expect(result.exitCode).toBeUndefined();
      });
    });

    describe("completion logic", () => {
      it("should return early if not in completion mode", async () => {
        mockParseEnv.mockReturnValue({
          complete: false,
          words: 0,
          point: 0,
          line: "",
          partial: "",
          last: "",
          lastPartial: "",
          prev: "",
        });

        const command = createCompletionServerCommand();
        await parseCommand(command, []);

        expect(mockLog).not.toHaveBeenCalled();
      });

      it("should provide root level completions", async () => {
        mockParseEnv.mockReturnValue({
          complete: true,
          words: 1,
          point: 0,
          line: "mxbai ",
          partial: "",
          last: "mxbai",
          lastPartial: "",
          prev: "",
        });
        mockGetShellFromEnv.mockReturnValue("bash");

        const command = createCompletionServerCommand();
        await parseCommand(command, []);

        expect(mockLog).toHaveBeenCalledWith(
          ["config", "store", "completion", "--help", "--version"],
          "bash",
          console.log
        );
      });

      describe("store completions", () => {
        const storeCommands = [
          "create",
          "delete",
          "get",
          "list",
          "update",
          "upload",
          "search",
          "qa",
          "sync",
          "files",
        ];

        it("should provide store completions for 'store' command", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai store ",
            partial: "",
            last: "store",
            lastPartial: "",
            prev: "store",
          });
          mockGetShellFromEnv.mockReturnValue("zsh");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            storeCommands,
            "zsh",
            console.log
          );
        });
      });

      describe("store name completions", () => {
        beforeEach(() => {
          const completionCache = jest.mocked(
            require("../../src/utils/completion-cache")
          );
          completionCache.getCurrentKeyName.mockReturnValue("test-key");
          completionCache.getStoresForCompletion.mockReturnValue([
            "store1",
            "store2",
            "store3",
          ]);
        });

        it("should provide store name completions for store commands that need a store name", async () => {
          // Test a representative command - the logic is the same for all
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai store get ",
            partial: "",
            last: "get",
            lastPartial: "",
            prev: "get",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            ["store1", "store2", "store3"],
            "bash",
            console.log
          );
        });

        it("should not provide store names if no key is set", async () => {
          const completionCache = jest.mocked(
            require("../../src/utils/completion-cache")
          );
          completionCache.getCurrentKeyName.mockReturnValue(null);

          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai store get ",
            partial: "",
            last: "get",
            lastPartial: "",
            prev: "get",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should not provide store names if cache is empty", async () => {
          const completionCache = jest.mocked(
            require("../../src/utils/completion-cache")
          );
          completionCache.getCurrentKeyName.mockReturnValue("test-key");
          completionCache.getStoresForCompletion.mockReturnValue([]);

          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai store sync ",
            partial: "",
            last: "sync",
            lastPartial: "",
            prev: "sync",
          });
          mockGetShellFromEnv.mockReturnValue("zsh");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should not provide store names for non-store commands", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai config get ",
            partial: "",
            last: "get",
            lastPartial: "",
            prev: "get",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should not provide store names for commands that don't need them", async () => {
          // Test that list and create don't get store name completions
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai store list ",
            partial: "",
            last: "list",
            lastPartial: "",
            prev: "list",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });
      });

      describe("files subcommand completions", () => {
        const filesCommands = ["list", "get", "delete"];

        it("should provide files completions for 'mxbai store files' context", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai store files ",
            partial: "",
            last: "files",
            lastPartial: "",
            prev: "files",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            filesCommands,
            "bash",
            console.log
          );
        });

        it("should provide store name completions for 'mxbai store files list' context", async () => {
          const completionCache = jest.mocked(
            require("../../src/utils/completion-cache")
          );
          completionCache.getCurrentKeyName.mockReturnValue("test-key");
          completionCache.getStoresForCompletion.mockReturnValue([
            "store1",
            "store2",
          ]);

          mockParseEnv.mockReturnValue({
            complete: true,
            words: 4,
            point: 0,
            line: "mxbai store files list ",
            partial: "",
            last: "list",
            lastPartial: "",
            prev: "list",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            ["store1", "store2"],
            "bash",
            console.log
          );
        });

        it("should not provide files completions for non-store contexts", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai config files ",
            partial: "",
            last: "files",
            lastPartial: "",
            prev: "files",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });
      });

      describe("config completions", () => {
        it("should provide config completions", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai config ",
            partial: "",
            last: "config",
            lastPartial: "",
            prev: "config",
          });
          mockGetShellFromEnv.mockReturnValue("pwsh");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            ["get", "set", "keys"],
            "pwsh",
            console.log
          );
        });
      });

      describe("keys subcommand completions", () => {
        const keysCommands = ["list", "add", "remove", "set-default"];

        it("should provide keys completions for 'mxbai config keys' context", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai config keys ",
            partial: "",
            last: "keys",
            lastPartial: "",
            prev: "keys",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            keysCommands,
            "bash",
            console.log
          );
        });

        it("should not provide keys completions for non-config contexts", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai store keys ",
            partial: "",
            last: "keys",
            lastPartial: "",
            prev: "keys",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should handle keys completions with different word counts", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 4,
            point: 0,
            line: "mxbai config keys add ",
            partial: "",
            last: "add",
            lastPartial: "",
            prev: "keys",
          });
          mockGetShellFromEnv.mockReturnValue("zsh");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            keysCommands,
            "zsh",
            console.log
          );
        });
      });

      describe("completion completions", () => {
        it("should provide completion completions", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai completion ",
            partial: "",
            last: "completion",
            lastPartial: "",
            prev: "completion",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            ["install", "uninstall", "refresh"],
            "bash",
            console.log
          );
        });
      });

      describe("edge cases", () => {
        it("should handle unknown previous command gracefully", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 2,
            point: 0,
            line: "mxbai unknown ",
            partial: "",
            last: "unknown",
            lastPartial: "",
            prev: "unknown",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should handle empty line gracefully", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "",
            partial: "",
            last: "files",
            lastPartial: "",
            prev: "files",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });

        it("should handle malformed completion line", async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 3,
            point: 0,
            line: "mxbai",
            partial: "",
            last: "files",
            lastPartial: "",
            prev: "files",
          });
          mockGetShellFromEnv.mockReturnValue("bash");

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).not.toHaveBeenCalled();
        });
      });
    });

    describe("shell integration", () => {
      const supportedShells = ["bash", "zsh", "fish", "pwsh"];

      supportedShells.forEach((shell) => {
        it(`should work with ${shell} shell`, async () => {
          mockParseEnv.mockReturnValue({
            complete: true,
            words: 1,
            point: 0,
            line: "mxbai ",
            partial: "",
            last: "mxbai",
            lastPartial: "",
            prev: "",
          });
          mockGetShellFromEnv.mockReturnValue(
            shell as "bash" | "zsh" | "fish" | "pwsh"
          );

          const command = createCompletionServerCommand();
          await parseCommand(command, []);

          expect(mockLog).toHaveBeenCalledWith(
            ["config", "store", "completion", "--help", "--version"],
            shell as "bash" | "zsh" | "fish" | "pwsh",
            console.log
          );
        });
      });
    });
  });

  describe("integration", () => {
    it("should integrate completion server with main completion command", () => {
      const completionCommand = createCompletionCommand();
      const serverCommand = createCompletionServerCommand();

      expect(completionCommand.name()).toBe("completion");
      expect(serverCommand.name()).toBe("completion-server");

      // Both commands should be separate and independent
      expect(completionCommand.commands.length).toBe(3); // install, uninstall, refresh
      expect(serverCommand.commands.length).toBe(0); // no subcommands
    });
  });
});
