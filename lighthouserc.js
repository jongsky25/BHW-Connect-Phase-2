// Performance budget gate — delivery-plan.md §5.2.
// Mobile emulation + throttling (Lighthouse default) stands in for the
// target "low-end mobile / Fast 3G" profile. Checked against "/" for now.
// /chat is authenticated-only (middleware redirects a signed-out request
// to /login), so an unauthenticated Lighthouse run against it would just
// re-measure /login under a different name — adding it for real needs an
// authenticated puppeteerScript, which is its own follow-up, not silently
// bolted on here.
module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/"],
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 30000,
      numberOfRuns: 1,
      settings: {
        // --no-sandbox is required in containerized CI runners executing as root.
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        // ≤ 200 KB gzipped initial JS
        "resource-summary:script:size": ["error", { maxNumericValue: 204800 }],
        // ≤ 300 KB total first-load
        "resource-summary:total:size": ["error", { maxNumericValue: 307200 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
