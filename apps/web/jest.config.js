/** @type {import("jest").Config} */
module.exports = {
  displayName: "web",
  moduleFileExtensions: ["js", "json", "ts"],
  roots: ["<rootDir>/app/lib"],
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
