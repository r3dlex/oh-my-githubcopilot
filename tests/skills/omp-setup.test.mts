import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSpawn = vi.fn();

vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

function makeChild(closeCode: number | null, errorMessage?: string) {
  return {
    on: vi.fn((event: string, cb: (arg?: number | Error) => void) => {
      if (errorMessage && event === "error") {
        cb(new Error(errorMessage));
      } else if (closeCode !== null && event === "close") {
        cb(closeCode);
      }
      return undefined;
    }),
  };
}

beforeEach(() => {
  mockSpawn.mockReset();
  delete process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"];
  delete process.env["OMP_COPILOT_STATUS_LINE_COMMAND"];
});

describe("omp-setup skill", () => {
  it("spawns setup from the packaged plugin root with OMP Copilot defaults", async () => {
    mockSpawn.mockReturnValue(makeChild(0));
    const mod = await import("../../src/skills/omp-setup.mts");

    await mod.activate({ trigger: "/omp:setup", args: ["--non-interactive"] });

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    const [command, args, options] = mockSpawn.mock.calls[0];
    expect(command).toBe("node");
    expect(args).toEqual(["bin/omp.mjs", "setup", "--non-interactive"]);
    expect(options.cwd).toContain("oh-my-githubcopilot");
    expect(options.env.OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES).toContain("STATUS_LINE");
    expect(options.env.OMP_COPILOT_STATUS_LINE_COMMAND).toContain("bin/omp-statusline.sh");
  });

  it("preserves explicit Copilot setup env overrides when present", async () => {
    process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"] = "CUSTOM_ONE,CUSTOM_TWO";
    process.env["OMP_COPILOT_STATUS_LINE_COMMAND"] = "/tmp/custom-statusline.sh";
    mockSpawn.mockReturnValue(makeChild(0));
    const mod = await import("../../src/skills/omp-setup.mts");

    await mod.activate({ trigger: "/omp:setup", args: [] });

    const [, , options] = mockSpawn.mock.calls[0];
    expect(options.env.OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES).toBe("CUSTOM_ONE,CUSTOM_TWO");
    expect(options.env.OMP_COPILOT_STATUS_LINE_COMMAND).toBe("/tmp/custom-statusline.sh");
  });

  it("returns an error when spawning setup fails", async () => {
    mockSpawn.mockReturnValue(makeChild(null, "ENOENT"));
    const mod = await import("../../src/skills/omp-setup.mts");

    const result = await mod.activate({ trigger: "/omp:setup", args: [] });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ENOENT");
  });
});
