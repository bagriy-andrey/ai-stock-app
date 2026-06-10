/** @type {import("jest").Config} */
module.exports = {
  displayName: "web",
  moduleFileExtensions: ["js", "json", "ts"],
  roots: ["<rootDir>/app/lib"],
  moduleNameMapper: {
    "^@ai-stock-advisor/shared$": "<rootDir>/../../packages/shared/src",
  },
  testEnvironment: "node",
  testRegex: ".*\\.test\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
};
