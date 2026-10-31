/**
 * Workflow hardening tests.
 *
 * One test per hardened behaviour, so a failure names the behaviour that
 * regressed. The rules they encode came out of a review of PR #35:
 *
 *   - every job bounds its RUNNING time with `timeout-minutes`
 *   - one build per commit (a `concurrency` group) and per-job mutable
 *     paths, so two runs of the same commit cannot share the runners' $HOME
 *   - the release workflow runs on a tag, not on every push to main
 *   - the release workflow writes its artifact into the runner's temp
 *     directory, not into the host-global /tmp
 *   - the release leg that verifies the artifact runs on the same platform
 *     as the leg that publishes it
 *   - the runner pool is described by the label that actually discriminates
 *   - the archgate version lives in package.json only
 *   - the ADR gate executes a binary whose SHA256 is pinned in the repo
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

type Step = {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
};

type Job = {
  name?: string;
  "runs-on"?: string | string[];
  "timeout-minutes"?: number;
  steps?: Step[];
  env?: Record<string, unknown>;
  needs?: string | string[];
  if?: string;
};

type Workflow = {
  name?: string;
  on?: unknown;
  env?: Record<string, unknown>;
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
  jobs?: Record<string, Job>;
};

const WORKFLOW_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/ci-prek.yml",
  ".github/workflows/release.yml",
];

function load(file: string): Workflow {
  return parse(readFileSync(resolve(file), "utf8")) as Workflow;
}

function raw(file: string): string {
  return readFileSync(resolve(file), "utf8");
}

function jobsOf(workflow: Workflow): [string, Job][] {
  return Object.entries(workflow.jobs ?? {});
}

function stepsOf(job: Job): Step[] {
  return job.steps ?? [];
}

describe("every job bounds its running time", () => {
  it.each(WORKFLOW_FILES)("%s gives every job a timeout-minutes", (file) => {
    const workflow = load(file);
    const jobs = jobsOf(workflow);

    expect(jobs.length).toBeGreaterThan(0);
    for (const [name, job] of jobs) {
      expect(
        job["timeout-minutes"],
        `${file}: job "${name}" has no timeout-minutes, so a hung build can hold a shared runner forever`,
      ).toBeTypeOf("number");
      expect(job["timeout-minutes"], `${file}: job "${name}"`).toBeGreaterThan(0);
    }
  });

  it.each(WORKFLOW_FILES)("%s has no workflow-level timeout-minutes", (file) => {
    // A workflow-level `timeout-minutes` is not a valid workflow key:
    // GitHub rejects the whole file with a zero-job run.
    const workflow = load(file) as Workflow & { "timeout-minutes"?: unknown };
    expect(
      workflow["timeout-minutes"],
      `${file} declares a workflow-level timeout-minutes`,
    ).toBeUndefined();
  });
});

describe("one build per commit", () => {
  it.each([".github/workflows/ci.yml", ".github/workflows/ci-prek.yml"])(
    "%s groups its runs by commit and cancels the duplicate",
    (file) => {
      const workflow = load(file);

      expect(workflow.concurrency, `${file} has no concurrency group`).toBeTruthy();
      expect(
        workflow.concurrency?.["cancel-in-progress"],
        `${file} does not cancel the superseded run`,
      ).toBe(true);

      const group = workflow.concurrency?.group ?? "";
      expect(group).toContain("github.event.pull_request.head.sha");
      expect(group).toContain("github.sha");
    },
  );

  it.each(WORKFLOW_FILES)(
    "%s isolates the mutable per-job paths under runner.temp",
    (file) => {
      const workflow = load(file);

      for (const [jobName, job] of jobsOf(workflow)) {
        for (const step of stepsOf(job)) {
          const script = step.run ?? "";
          if (!/\bnpmx?\s/u.test(script)) continue;

          const env = step.env ?? {};
          expect(
            env.npm_config_cache,
            `${file}: job "${jobName}" step "${step.name ?? script.slice(0, 40)}" shares the runners' npm cache`,
          ).toContain("runner.temp");
          expect(
            env.XDG_CACHE_HOME,
            `${file}: job "${jobName}" step "${step.name ?? script.slice(0, 40)}" shares the runners' XDG cache`,
          ).toContain("runner.temp");
        }
      }
    },
  );
});

describe("the npm cache never leaves the job", () => {
  it.each(WORKFLOW_FILES)(
    "%s caches npm in the job-local directory, not the runners' shared ~/.npm",
    (file) => {
      const workflow = load(file);

      for (const [jobName, job] of jobsOf(workflow)) {
        for (const step of stepsOf(job)) {
          if (!(step.uses ?? "").includes("actions/setup-node")) continue;
          if (step.with?.cache !== "npm") continue;

          // setup-node resolves the npm cache directory with
          // `npm config get cache`, so the env on the ACTION step is what
          // decides whether it caches the job-local directory or the
          // runners' shared ~/.npm. The fleet's two runners share one
          // $HOME, so ~/.npm is written by every job of every repository
          // in the organisation: caching it means tarring and uploading a
          // directory another job is mutating at the same time (measured:
          // a ~6 minute post step on a cache miss) and leaving this
          // repository's tarballs where any other repository can read them.
          expect(
            step.env?.npm_config_cache,
            `${file}: job "${jobName}" caches the runners' shared ~/.npm`,
          ).toContain("runner.temp");
        }
      }
    },
  );

  it.each(WORKFLOW_FILES)(
    "%s keeps the cache the job uses and the cache setup-node manages identical",
    (file) => {
      const workflow = load(file);

      for (const [jobName, job] of jobsOf(workflow)) {
        const cacheDirs = new Set<string>();
        for (const step of stepsOf(job)) {
          const dir = step.env?.npm_config_cache;
          if (typeof dir === "string") cacheDirs.add(dir);
        }
        if (cacheDirs.size === 0) continue;

        expect(
          [...cacheDirs],
          `${file}: job "${jobName}" mixes npm cache directories`,
        ).toHaveLength(1);
      }
    },
  );
});

describe("the release workflow fires on a tag, not on every push to main", () => {
  it("has tags but no branches in its push trigger", () => {
    const workflow = load(".github/workflows/release.yml");
    const on = workflow.on as { push?: { tags?: string[]; branches?: string[] } };

    expect(on.push, "the release workflow has no push trigger").toBeTruthy();
    expect(on.push?.tags, "the release workflow no longer reacts to tags").toEqual(
      ["v*.*.*"],
    );
    expect(
      on.push?.branches,
      "a push to main still fires the full release build and test on the shared fleet",
    ).toBeUndefined();
  });

  it("keeps a manual dispatch as the on-demand path", () => {
    const workflow = load(".github/workflows/release.yml");
    const on = workflow.on as { "workflow_dispatch"?: unknown };

    expect(on["workflow_dispatch"]).toBeTruthy();
  });
});

describe("the release artifact stays inside the job", () => {
  it("writes no fixed path under /tmp", () => {
    const workflow = load(".github/workflows/release.yml");
    const hostGlobalTmp = /(?:^|[\s"'=])\/tmp\//u;

    for (const [jobName, job] of jobsOf(workflow)) {
      for (const step of stepsOf(job)) {
        const script = step.run ?? "";
        expect(
          script,
          `${jobName}/${step.name ?? "run"} writes to the host-global /tmp`,
        ).not.toMatch(hostGlobalTmp);

        const paths = step.with?.path;
        if (typeof paths === "string") {
          expect(
            paths,
            `${jobName}/${step.name ?? "upload"} uploads from the host-global /tmp`,
          ).not.toMatch(hostGlobalTmp);
        }
      }
    }
  });

  it("tars the artifact into the runner's temp directory", () => {
    const workflow = load(".github/workflows/release.yml");
    const build = workflow.jobs?.build;
    const tarStep = stepsOf(build ?? {}).find((step) =>
      (step.run ?? "").includes("release-artifact.tar.gz"),
    );

    expect(tarStep, "the release build does not tar an artifact").toBeTruthy();
    expect(tarStep?.run).toContain("runner.temp");
  });
});

describe("the release verifies the bytes it publishes", () => {
  it("runs the test leg on the same platform as the publish leg", () => {
    const workflow = load(".github/workflows/release.yml");
    const test = workflow.jobs?.test;
    const publish = workflow.jobs?.publish;

    expect(test?.["runs-on"], "the release test leg has no runs-on").toBeTruthy();
    expect(
      test?.["runs-on"],
      "the release test leg and the publish leg run on different platforms, so the published bytes are not the verified ones",
    ).toEqual(publish?.["runs-on"]);
  });

  it("documents the platform split", () => {
    const text = raw(".github/workflows/release.yml");

    expect(text).toMatch(/better-sqlite3/u);
    expect(text).toMatch(/architecture-neutral/u);
  });
});

describe("the runner pool is described by the label that discriminates", () => {
  it.each(WORKFLOW_FILES)(
    "%s selects the fleet with the ubuntu-latest label alone",
    (file) => {
      const workflow = load(file);

      for (const [name, job] of jobsOf(workflow)) {
        const runsOn = job["runs-on"];
        if (typeof runsOn === "string") continue;

        expect(
          runsOn,
          `${file}: job "${name}" selects the fleet with ${JSON.stringify(runsOn)}`,
        ).toEqual(["self-hosted", "ubuntu-latest"]);
      }
    },
  );

  it.each([".github/workflows/ci.yml", ".github/workflows/ci-prek.yml"])(
    "%s names every runner family the pool could match",
    (file) => {
      const text = raw(file);

      // The comment has to enumerate the runners, because the labels that
      // do NOT appear in the array are exactly what a reader cannot see.
      for (const family of [
        "r3dlex-runner-3",
        "r3dlex-runner-4",
        "r3dlex-linux-arm64",
        "r3dlex-linux-x64",
        "r3dlex-runner-1",
      ]) {
        expect(text, `${file} does not mention ${family}`).toContain(family);
      }

      expect(
        text,
        `${file} still claims a label the array does not use narrows the pool`,
      ).not.toContain("rather than `ARM64`");
    },
  );
});

describe("the archgate version has one source of truth", () => {
  it.each(WORKFLOW_FILES)("%s carries no archgate version literal", (file) => {
    expect(raw(file)).not.toContain("EXPECTED_ARCHGATE_VERSION");
  });

  it("reads the declared version from package.json", () => {
    const script = raw("scripts/archgate-gate.sh");

    expect(script).toContain("devDependencies.archgate");
  });
});

describe("the ADR gate executes a pinned binary", () => {
  it.each([".github/workflows/ci.yml", ".github/workflows/release.yml"])(
    "%s runs the gate script rather than a bare archgate",
    (file) => {
      const workflow = load(file);
      const gateSteps = stepsOf(workflow.jobs?.test ?? {}).filter((step) =>
        (step.run ?? "").includes("archgate-gate.sh"),
      );

      expect(
        gateSteps.length,
        `${file}: the test leg does not run scripts/archgate-gate.sh`,
      ).toBeGreaterThan(0);
    },
  );

  it("installs archgate job-locally in the release test leg", () => {
    const workflow = load(".github/workflows/release.yml");
    const steps = stepsOf(workflow.jobs?.test ?? {});

    const install = steps.find((step) => (step.run ?? "").includes("archgate"));
    expect(install, "the release test leg does not install archgate").toBeTruthy();
    expect(install?.run).toContain("npx archgate");

    const gate = steps.find((step) =>
      (step.run ?? "").includes("archgate-gate.sh"),
    );
    expect(gate?.env?.ARCHGATE_BIN).toContain("steps.archgate.outputs.path");
  });
});
