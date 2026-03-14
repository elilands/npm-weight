#!/usr/bin/env node
import { cac } from "cac";
import { executeAnalyze } from "./commands/analyze.js";

const cli = cac("npm-weight");

cli
  .command("analyze", "Analyzes the current package.json and calculates dependency weight")
  .alias("a")
  .option("--json", "Output pure JSON for CI/CD")
  .option("--md", "Output pure Markdown for GitHub PRs")
  .action(executeAnalyze);

cli.help();
cli.parse();