const { mkdirSync } = require("fs");
const path = require("path");
const uuid = require("uuid/v4");

/**
 * Create a directory to store downloaded assessments
 *
 * @param {String} pwd - where to create the directory
 */
function createTmpDir(pwd) {
  const dirName = `tmp-${uuid()}`;
  const fullPath = path.join(pwd, dirName);
  mkdirSync(fullPath);
  return { fullPath, dirName };
}

module.exports = { createTmpDir };
