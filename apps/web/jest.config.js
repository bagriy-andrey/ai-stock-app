/** @type {import("jest").Config} */
module.exports = {
  displayName: "web",
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  roots: ["<rootDir>/app"],
  moduleNameMapper: {
    "^@ai-stock-advisor/shared$": "<rootDir>/../../packages/shared/src",
  },
  testEnvironment: "node",
  testRegex: ".*\\.test\\.(ts|tsx)$",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
};
