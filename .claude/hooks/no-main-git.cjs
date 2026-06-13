// PreToolUse(Bash) hook: blocks `git commit` / `git push` while on main/master.
// Reads the tool-call JSON on stdin; if the command is a commit/push AND the
// current branch is main/master, returns a deny decision. Otherwise allows.
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let cmd = "";
  try {
    cmd = (JSON.parse(input).tool_input || {}).command || "";
  } catch {
    /* no/invalid stdin → allow */
  }
  if (!/git\s+(commit|push)/.test(cmd)) process.exit(0); // not a commit/push → allow

  let branch = "";
  try {
    branch = require("child_process")
      .execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" })
      .trim();
  } catch {
    /* not a git repo / detached → allow */
  }

  if (branch === "main" || branch === "master") {
    const action = /git\s+push/.test(cmd) ? "push" : "commit";
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Direct git ${action} on "${branch}" is blocked by a local hook. Create a feature branch first (git checkout -b <name>), then open a PR.`,
        },
      }),
    );
  }
  process.exit(0);
});
