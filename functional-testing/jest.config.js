module.exports = {
    globals: {
    },
    globalSetup:"./global_setup",
    moduleDirectories: [
      "node_modules",
      "helpers",
      "schemas",
      "test_data"
    ],
    runner:"groups",
    testPathIgnorePatterns: [
      "/node_modules/"
    ],
    transform: {'^.+\\.ts?$': 'ts-jest'},
    testEnvironment: 'node',
    //testRegex: './__tests__/.*\\.(spec)?\\.(js|tsx)$',
    testRunner: "jest-circus/runner",
    verbose: true
}