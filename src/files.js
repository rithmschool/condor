const {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync
} = require("fs");
const path = require("path");
const uuid = require("uuid/v4");
const util = require("util");
const childProcess = require("child_process");
const rimraf = require("rimraf");
const AdamZip = require("adm-zip");
const exec = util.promisify(childProcess.exec);

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

/**
 * Search through a directory and return data on all zip files.
 *
 * @param {String} dir - directory to search for *.zip files
 */
function getAllZipFiles(dir) {
  return readdirSync(dir, { withFileTypes: false })
    .filter(f => f.match(/\.zip$/))
    .map(z => ({
      filename: z,
      zip: AdamZip(path.join(dir, z))
    }));
}

/**
 *
 * @param {Object[]} zips - Array of { filename, zip } objects
 * @param {String} assessmentName - current assessment
 * @param {String} sourceDir - location of files to extract
 * @param {String} destDir - destination for unzipped files
 * @param {String[]} students - array of student names (first + last)
 */
function extractEachZip(zips, assessmentName, sourceDir, destDir, students) {
  let origFolders = new Set(readdirSync(sourceDir, { withFileTypes: false }));
  zips.forEach(z => {
    const [_, firstName, lastName, ...rest] = z.filename.split("-");
    // download each zip by default if no students array provided.
    // if the array is provided, only download if the student name matches an array entry.
    const shouldDownload =
      !students || (students && students.includes(`${firstName} ${lastName}`));
    if (shouldDownload) {
      console.log("downloading", firstName);
      z.zip.extractAllTo(sourceDir, true);
      let files = _getNewlyUnzippedFiles(sourceDir, origFolders);
      let studentDir = `${firstName}-${lastName}-${assessmentName}`;
      if (existsSync(path.join(sourceDir, studentDir))) {
        studentDir = `${studentDir}-${uuid()}`;
      }
      _moveAll(files, sourceDir, studentDir);
      origFolders.add(studentDir);
      _recursivelyNpmInstall(path.join(sourceDir, studentDir));
      // TODO: once all the folders ahve been npm installed, move them
      //renameSync(path.join(sourceDir, studentDir), path.join(destDir, studentDir));
    }
  });
  // TODO: Delete the temp dir once everything is done and moved out.
  //deleteDir(tempDir.fullPath);
}

/**
 * Move all folders from the fromDir directory to the toDir directory.
 *
 * @param {String[]} files - array of directory names
 * @param {String} fromDir - directory to move from
 * @param {String} toDir - directory to move to
 */
function _moveAll(files, fromDir, toDir) {
  if (files.length !== 1) {
    mkdirSync(path.join(fromDir, toDir));
    files.forEach(f =>
      renameSync(path.join(fromDir, f), path.join(fromDir, toDir, f))
    );
  } else {
    let f = files[0];
    renameSync(path.join(fromDir, f), path.join(fromDir, toDir));
  }
}

/**
 * Find newly created files in sourceDir after unzipping a .zip file.
 *
 * @param {String} sourceDir - directory containing zip files
 * @param {String[]} origFolders - folders that existed prior to unzipping the current file
 */
function _getNewlyUnzippedFiles(sourceDir, origFolders) {
  const deleteDir = rimraf.sync;
  let files = readdirSync(sourceDir, { withFileTypes: false });
  files
    .filter(f => f.match(/^__MACOSX$/))
    .forEach(d => deleteDir(path.join(sourceDir, d)));
  return readdirSync(sourceDir, { withFileTypes: false }).filter(
    f => !origFolders.has(f)
  );
}

/**
 * Recursively npm install in any subdirectory with a package.json
 *
 * @param {String} dir - directory to start looking for node projects
 */
function _recursivelyNpmInstall(dir) {
  let files = readdirSync(dir, { withFileTypes: false }).filter(
    f => f !== "node_modules"
  );

  let packageJSON = files.find(f => f === "package.json");
  if (packageJSON) {
    exec("npm install", { cwd: dir }).then(() =>
      console.log(`npm install at ${dir}`)
    );
  }

  let dirs = files.filter(f => statSync(path.join(dir, f)).isDirectory());
  dirs.forEach(d => _recursivelyNpmInstall(path.join(dir, d)));
}

module.exports = { createTmpDir, extractEachZip, getAllZipFiles };
