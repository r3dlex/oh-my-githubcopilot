import { mkdtemp, readFile, rm, writeFile, mkdir } from "fs/promises";
import { readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInstall } from "../../src/cli/install.mts";

let tmpDir: string;
let settingsPath: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "omp-install-"));
  settingsPath = join(tmpDir, "settings.json");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("runInstall", () => {
  it("missing file creates settings with all 4 required keys", async () => {
    await runInstall(settingsPath);

    const raw = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(raw) as Record<string, unknown>;

    expect(settings).toHaveProperty("enabledPlugins");
    expect(settings).toHaveProperty("experimental");
    expect(settings).toHaveProperty("statusLine");
    expect(settings).toHaveProperty("extraKnownMarketplaces");

    const statusLine = settings.statusLine as { type: string; command: string };
    expect(path.isAbsolute(statusLine.command)).toBe(true);
  });

  it("is idempotent — two calls produce identical file content", async () => {
    await runInstall(settingsPath);
    const first = readFileSync(settingsPath, "utf-8");

    await runInstall(settingsPath);
    const second = readFileSync(settingsPath, "utf-8");

    expect(JSON.parse(second)).toEqual(JSON.parse(first));
  });

  it("preserves existing footer and other plugins", async () => {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      JSON.stringify({
        footer: { showVersion: true },
        enabledPlugins: { "other@vendor": true },
      }),
      "utf-8"
    );

    await runInstall(settingsPath);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      footer: { showVersion: boolean };
      enabledPlugins: Record<string, boolean>;
    };

    expect(settings.footer.showVersion).toBe(true);
    expect(settings.enabledPlugins["other@vendor"]).toBe(true);
    expect(settings.enabledPlugins["oh-my-githubcopilot@oh-my-githubcopilot"]).toBe(true);
  });

  it("statusLine.command and marketplace path are absolute", async () => {
    await runInstall(settingsPath);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      statusLine: { command: string };
      extraKnownMarketplaces: Record<string, { source: { source: string; path: string } }>;
    };

    expect(path.isAbsolute(settings.statusLine.command)).toBe(true);
    expect(settings.statusLine.command.endsWith("bin/omp-statusline.sh")).toBe(true);
    expect(
      path.isAbsolute(settings.extraKnownMarketplaces["oh-my-githubcopilot"].source.path)
    ).toBe(true);
  });

  it("recovers from malformed prior JSON", async () => {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, "not json", "utf-8");

    await runInstall(settingsPath);

    const raw = readFileSync(settingsPath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
    const settings = JSON.parse(raw) as Record<string, unknown>;
    expect(settings).toHaveProperty("enabledPlugins");
  });

  it("preserves existing marketplace entry alongside oh-my-githubcopilot", async () => {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      JSON.stringify({
        extraKnownMarketplaces: {
          "other-marketplace": {
            source: { source: "directory", path: "/other" },
          },
        },
      }),
      "utf-8"
    );

    await runInstall(settingsPath);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      extraKnownMarketplaces: Record<string, unknown>;
    };

    expect(settings.extraKnownMarketplaces).toHaveProperty("other-marketplace");
    expect(settings.extraKnownMarketplaces).toHaveProperty("oh-my-githubcopilot");
  });

  it("upgrades relative marketplace path to absolute", async () => {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(
      settingsPath,
      JSON.stringify({
        extraKnownMarketplaces: {
          "oh-my-githubcopilot": {
            source: { source: "directory", path: "." },
          },
        },
      }),
      "utf-8"
    );

    await runInstall(settingsPath);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      extraKnownMarketplaces: Record<string, { source: { source: string; path: string } }>;
    };

    const mktPath = settings.extraKnownMarketplaces["oh-my-githubcopilot"].source.path;
    expect(mktPath).not.toBe(".");
    expect(path.isAbsolute(mktPath)).toBe(true);
  });
});
