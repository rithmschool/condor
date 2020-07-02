const { execSync } = require("child_process");

/**
 * Generate the remote file path to a collection of assessment submissions.
 * 
 * @param {String[]} basePathArray - array of remote folder names to get to assessments
 * @param {String} cohort - current Rithm cohort
 * @param {String} assessmentName - current assessment name
 */
function buildSubmissionsPath(basePathArray, cohort, assessmentName) {
  return `/${[...basePathArray, cohort, assessmentName].join('/')}/`;
}

/**
 * Copy all zip files from a remote path to a given local path
 * 
 * @param {String} userName - username for ssh access
 * @param {String} serverName - servername for ssh access
 * @param {String} remotePath - remote path to assessment zip files
 * @param {String} localpath - local destination for zip files
 */
function scpZipFilesToDir(userName, serverName, remotePath, localpath) {
  let command = `scp ${userName}@${serverName}:${remotePath}*.zip ${localpath}/`;
  return execSync(command);
}

module.exports = { buildSubmissionsPath, scpZipFilesToDir };