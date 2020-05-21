const {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync
} = require('fs');
const path = require('path');
const uuid = require('uuid/v4');
const util = require('util');
const childProcess = require('child_process');
const {execSync} = childProcess;
const exec = util.promisify(childProcess.exec);
const rimraf = require('rimraf');
const AdamZip = require('adm-zip');
const commandLineArgs = require('command-line-args');
const { getAssessment, getCohort } = require("./src/command");
const { createTmpDir } = require("./src/files");

const optionDefinitions = [
  { name: 'cohort', alias: 'c', type: String },
  { name: 'assessment', alias: 'a', type: String},
];
let students = null;
try {
  students = require("./students");
} catch(e) {
  console.warn("no array of students found. Downloading assessments for all students. You can speficy your advisees by putting their names in an array in a students.js file. Example: const students = ['fname lname'];");
}
const commandLineOptions = commandLineArgs(optionDefinitions)

const pwd = __dirname;
const submissionsBasePath = [
  'home',
  'ubuntu',
  'sis',
  'media',
  'submissions',
];
const scpUserName = "ubuntu";
const serverName = "sis.rithmschool.com";

function buildSubmissionsPath(basePathArray, cohort, assessmentName) {
  return `/${[...basePathArray, cohort, assessmentName].join('/')}/`;
}

const deleteDir = rimraf.sync;

function scpFilesToDir(userName, serverName, remotePath, localpath) {
  let command = `scp ${userName}@${serverName}:${remotePath}*.zip ${localpath}/`;
  return execSync(command);
}

function getAllZipFiles(dir) {
  return readdirSync(dir, {withFileTypes: false})
    .filter(f => f.match(/\.zip$/))
    .map(z => ({
      filename: z,
      zip: AdamZip(path.join(dir, z))
    }));
}

function recursivelyNpmInstall(dir) {
  let files = readdirSync(dir, {withFileTypes: false})
    .filter(f => f !== 'node_modules');

  let packageJSON = files.find(f => f === 'package.json');
  if (packageJSON) {
    exec('npm install', {cwd: dir}).then(() =>
      console.log(`npm install at ${dir}`)
    );
  }

  let dirs = files.filter(f => statSync(path.join(dir, f)).isDirectory());
  dirs.forEach(d => recursivelyNpmInstall(path.join(dir, d)));
}

function extractEachZip(zips, assessmentName, sourceDir, destDir) {
  let origFolders = new Set(readdirSync(sourceDir, {withFileTypes: false}));
  zips.forEach(z => {
    const [_, firstName, lastName, ...rest] = z.filename.split('-');
    if (students && students.includes(`${firstName} ${lastName}`)) {
      console.log("downloading", firstName)
      z.zip.extractAllTo(sourceDir, true);
      let files = readdirSync(sourceDir, {withFileTypes: false})
      files
        .filter(f => f.match(/^__MACOSX$/))
        .forEach(d => deleteDir(path.join(sourceDir, d)));
      files = readdirSync(sourceDir, {withFileTypes: false})
        .filter(f => !origFolders.has(f));
      let studentDir = `${firstName}-${lastName}-${assessmentName}`;
      if (existsSync(path.join(sourceDir, studentDir))) {
        studentDir = `${studentDir}-${uuid()}`;
      }
      if (files.length !== 1) {
        mkdirSync(path.join(sourceDir, studentDir));
        files.forEach(f =>
          renameSync(path.join(sourceDir, f), path.join(sourceDir, studentDir, f))

        )
      } else {
        let f = files[0];
        renameSync(path.join(sourceDir, f), path.join(sourceDir, studentDir))
      }
      origFolders.add(studentDir);
      recursivelyNpmInstall(path.join(sourceDir, studentDir));
      // TODO: once all the folders ahve been npm installed, move them
      //renameSync(path.join(sourceDir, studentDir), path.join(destDir, studentDir));
    }
  })

}

const tempDir = createTmpDir(pwd);
const cohort = getCohort(commandLineOptions.cohort);
const assessment = getAssessment(commandLineOptions.assessment);
scpFilesToDir(
  scpUserName,
  serverName,
  buildSubmissionsPath(submissionsBasePath, cohort, assessment),
  tempDir.fullPath
);

const zips = getAllZipFiles(tempDir.fullPath);
extractEachZip(zips, assessment, tempDir.fullPath, pwd);

// TODO: Delete the temp dir once everything is done and moved out.
//deleteDir(tempDir.fullPath);
