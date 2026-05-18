const path = require("path");
const nextJest = require("./nextjs/node_modules/next/jest")({
  dir: path.resolve(__dirname, "nextjs"),
});

const customConfig = {
  displayName: "taskforge-root",
  rootDir: path.resolve(__dirname),
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: [
    path.resolve(__dirname, "jest.setup.js"),
  ],
  testMatch: ["<rootDir>/tests/**/*.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": path.resolve(__dirname, "nextjs/$1"),
  },
  moduleDirectories: [
    "node_modules",
    path.resolve(__dirname, "nextjs/node_modules"),
  ],
};

module.exports = nextJest(customConfig);
