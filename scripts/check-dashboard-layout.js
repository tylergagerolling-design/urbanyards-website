#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];
const passes = [];

function readFile(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function collectMatches(text, regex) {
  const values = [];
  let match;
  while ((match = regex.exec(text))) {
    values.push(match[1] || match[2] || match[3] || "");
  }
  return values;
}

function addError(message) {
  errors.push(message);
}

function addPass(message) {
  passes.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function stripQuery(href) {
  return href.split("?")[0].split("#")[0];
}

function cssBasename(href) {
  return path.basename(stripQuery(href)).toLowerCase();
}

function isForbiddenDashboardCssName(name) {
  const lower = name.toLowerCase();
  if (lower === "dashboard.css" || lower === "style.css") return false;
  return (
    /^dashboard-(hotfix|final|fix|new|override|emergency)(?:[-.\w]*)?\.css$/.test(lower) ||
    /^dashboard.*(?:hotfix|final|override|emergency).*\.css$/.test(lower) ||
    /^dashboard-mobile-fix(?:[-.\w]*)?\.css$/.test(lower) ||
    /^mobile-(final|fix|hotfix|override|emergency)(?:[-.\w]*)?\.css$/.test(lower)
  );
}

function isLiteralAction(value) {
  return /^[a-z0-9-]+$/.test(value);
}

const dashboardHtml = readFile("dashboard.html");
const dashboardJs = readFile("dashboard.js");
const dashboardCss = readFile("dashboard.css");

function checkStylesheets() {
  const stylesheetHrefs = unique(collectMatches(
    dashboardHtml,
    /<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi
  ));
  const dashboardCssLinks = stylesheetHrefs.filter((href) => cssBasename(href).startsWith("dashboard"));
  const forbiddenLinks = stylesheetHrefs.filter((href) => isForbiddenDashboardCssName(cssBasename(href)));

  if (!dashboardCssLinks.some((href) => cssBasename(href) === "dashboard.css")) {
    addError("dashboard.html must load dashboard.css as the dashboard source stylesheet.");
  }

  if (forbiddenLinks.length) {
    addError(`Forbidden dashboard hotfix stylesheet linked from dashboard.html: ${forbiddenLinks.join(", ")}`);
  }

  if (dashboardCssLinks.filter((href) => cssBasename(href) !== "dashboard.css").length) {
    addError(`Dashboard should not load extra dashboard CSS layers: ${dashboardCssLinks.join(", ")}`);
  }

  if (!forbiddenLinks.length && dashboardCssLinks.some((href) => cssBasename(href) === "dashboard.css")) {
    addPass("dashboard.html loads one dashboard source stylesheet and no hotfix layers.");
  }
}

function checkForbiddenCssFiles() {
  const rootCssFiles = fs.readdirSync(rootDir).filter((file) => file.toLowerCase().endsWith(".css"));
  const allowedRetiredStubs = new Set(["dashboard-hotfix.css", "dashboard-mobile-fix.css"]);
  const linkedCssNames = new Set(collectMatches(
    dashboardHtml,
    /<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi
  ).map(cssBasename));

  rootCssFiles.forEach((file) => {
    if (!isForbiddenDashboardCssName(file)) return;
    const lower = file.toLowerCase();
    const content = readFile(file);
    const isRetiredStub = allowedRetiredStubs.has(lower) &&
      /Retired/i.test(content) &&
      /not\s+linked/i.test(content);

    if (isRetiredStub && !linkedCssNames.has(lower)) {
      addWarning(`${file} is allowed only as a retired, unlinked stub.`);
      return;
    }

    addError(`Forbidden dashboard hotfix/final stylesheet file found: ${file}`);
  });

  addPass("No active forbidden dashboard hotfix/final stylesheet files found.");
}

function checkDashboardSections() {
  const sectionIds = unique(collectMatches(
    dashboardHtml,
    /<section\b(?=[^>]*\bclass=["'][^"']*\bdashboard-section\b[^"']*["'])(?=[^>]*\bid=["']([^"']+)["'])[^>]*>/gi
  ));
  const dashboardLinks = unique(collectMatches(dashboardHtml, /data-dashboard-link=["']([^"']+)["']/gi));
  const hashLinks = unique(collectMatches(dashboardHtml, /href=["']#([^"']+)["']/gi))
    .filter((target) => sectionIds.includes(target));
  const navTargets = unique([...dashboardLinks, ...hashLinks]);

  const missingTargets = navTargets.filter((target) => !sectionIds.includes(target));
  const unlinkedSections = sectionIds.filter((section) => !navTargets.includes(section));

  if (!sectionIds.length) {
    addError("No dashboard sections were found.");
  }
  if (missingTargets.length) {
    addError(`Dashboard links point to missing sections: ${missingTargets.join(", ")}`);
  }
  if (unlinkedSections.length) {
    addError(`Dashboard sections are not reachable through dashboard links: ${unlinkedSections.join(", ")}`);
  }

  if (sectionIds.length && !missingTargets.length && !unlinkedSections.length) {
    addPass(`Dashboard section/link map is complete (${sectionIds.length} sections).`);
  }
}

function checkActions() {
  const literalActionRegex = /data-action\s*=\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;
  const htmlActions = collectMatches(dashboardHtml, literalActionRegex).filter(isLiteralAction);
  const jsActions = collectMatches(dashboardJs, literalActionRegex).filter(isLiteralAction);
  const staticActions = unique([...htmlActions, ...jsActions]);

  const handlerActions = unique([
    ...collectMatches(dashboardJs, /action\s*={2,3}\s*["'`]([a-z0-9-]+)["'`]/g),
    ...collectMatches(dashboardJs, /case\s+["'`]([a-z0-9-]+)["'`]/g)
  ]);

  const missingHandlers = staticActions.filter((action) => !handlerActions.includes(action));

  if (!staticActions.length) {
    addError("No static data-action values found. The action audit may be broken.");
  }
  if (missingHandlers.length) {
    addError(`Static data-action values without matching handlers: ${missingHandlers.join(", ")}`);
  }
  if (staticActions.length && !missingHandlers.length) {
    addPass(`Static data-action coverage is complete (${staticActions.length} literal actions).`);
  }
}

function checkCssTokens() {
  const requiredTokens = [
    "--uy-page-pad",
    "--uy-shell-gap",
    "--uy-section-gap",
    "--uy-card-pad",
    "--uy-button-h",
    "--uy-rail-width",
    "--uy-drawer-width",
    "--uy-sidebar-icon",
    "--uy-sidebar-icon-art"
  ];
  const designSystemTokens = [
    "--color-bg",
    "--color-surface",
    "--color-primary",
    "--color-muted",
    "--color-border",
    "--radius-card",
    "--radius-pill",
    "--shadow-card",
    "--shadow-button",
    "--transition-normal"
  ];

  const allRequiredTokens = [...requiredTokens, ...designSystemTokens];
  const missingTokens = allRequiredTokens.filter((token) => !dashboardCss.includes(token));
  const underusedTokens = allRequiredTokens.filter((token) => {
    const count = (dashboardCss.match(new RegExp(token.replace(/-/g, "\\-"), "g")) || []).length;
    return count < 2;
  });

  if (missingTokens.length) {
    addError(`Required dashboard CSS tokens are missing: ${missingTokens.join(", ")}`);
  }
  if (underusedTokens.length) {
    addError(`Required dashboard CSS tokens appear unused or barely used: ${underusedTokens.join(", ")}`);
  }
  if (!missingTokens.length && !underusedTokens.length) {
    addPass("Required dashboard CSS source-of-truth tokens are present and used.");
  }
}

function checkDesktopSidebarSystem() {
  const requiredSnippets = [
    ".dashboard-sidebar:hover",
    ".dashboard-sidebar:focus-within",
    ".app-view.is-sidebar-open",
    "grid-template-columns: var(--uy-rail-width) minmax(0, 1fr)",
    ".sidebar-scrim",
    "pointer-events: none"
  ];
  const missingSnippets = requiredSnippets.filter((snippet) => !dashboardCss.includes(snippet));

  if (missingSnippets.length) {
    addError(`Desktop drawer hover/focus source-of-truth snippets are missing: ${missingSnippets.join(", ")}`);
    return;
  }
  addPass("Desktop drawer hover/focus source-of-truth rules are present.");
}

function checkLegacyMarkers() {
  const forbiddenMarkers = [
    "Final mobile webapp dock override",
    "Absolute final desktop rail",
    "Final desktop no-page-scroll",
    "Laptop-height sidebar fit repair",
    "True final dashboard flow pass"
  ];
  const found = forbiddenMarkers.filter((marker) => dashboardCss.includes(marker));
  if (found.length) {
    addError(`Obsolete dashboard override markers remain in dashboard.css: ${found.join(", ")}`);
    return;
  }
  addPass("Obsolete dashboard override marker scan is clean.");
}

checkStylesheets();
checkForbiddenCssFiles();
checkDashboardSections();
checkActions();
checkCssTokens();
checkDesktopSidebarSystem();
checkLegacyMarkers();

console.log("Dashboard layout guardrail audit");
passes.forEach((message) => console.log(`PASS ${message}`));
warnings.forEach((message) => console.log(`WARN ${message}`));

if (errors.length) {
  errors.forEach((message) => console.error(`FAIL ${message}`));
  process.exit(1);
}

console.log("PASS Dashboard layout guardrails passed.");
