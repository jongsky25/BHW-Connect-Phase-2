// Performance budget gate — delivery-plan.md §5.2.
// Mobile emulation + throttling (Lighthouse default) stands in for the
// target "low-end mobile / Fast 3G" profile. Checked against "/" for now
// (the only route in this increment); the Chat Guide and Login routes
// named in §5.2 join this list once INC-1/INC-5 ship.
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
