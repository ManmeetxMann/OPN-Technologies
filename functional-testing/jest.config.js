module.exports = {
    globals: {
    },
    moduleDirectories: [
      "node_modules",
      "helpers",
      "schemas",
      "test_data"
    ],
    runner: "groups",
    setupFiles: [
        'dotenv/config'
    ],
    testPathIgnorePatterns: [
      "/node_modules/"
    ],
    verbose: true
}