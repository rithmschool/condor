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
const optionDefinitions = [
  { name: 'cohort', alias: 'c', type: String },
  { name: 'assessment', alias: 'a', type: String},
];
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

// Check the process.env, the command line, then prompt
function getCohort(commandLineCohort) {
  let val;
  if (commandLineCohort) {
    val = commandLineCohort
  } else if (process.env.RITHM_COHORT) {
    val = process.env.RITHM_COHORT;
  } else {
    val = prompt("You do not have the RITHM_COHORT environment variable set. What is your cohort? (example: r11)");
  }

  if (val && val.match(/^r\d{1,2}$/g)) {
    return val;
  } else {
    console.error("The rithm cohort was invalid or not set.  Remember to set an environment variable like RITHM_COHORT=r11");
    process.exit(1)
  }
}

function getAssessment(commandLineAssessment) {
  if (!commandLineAssessment) {
    console.error("The assessment was invalid or not set.  Remember to add the --assessment flag or -a for short");
    process.exit(1)
  }
  return commandLineAssessment;
}

function createTmpDir(pwd) {
  const tmpDir = `tmp-${uuid()}`;
  const fullPath = path.join(pwd, tmpDir);
  mkdirSync(fullPath);
  return {fullPath, dirName: tmpDir};
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
    z.zip.extractAllTo(sourceDir, true);
    let files = readdirSync(sourceDir, {withFileTypes: false})
    files
      .filter(f => f.match(/^__MACOSX$/))
      .forEach(d => deleteDir(path.join(sourceDir, d)));
    files = readdirSync(sourceDir, {withFileTypes: false})
      .filter(f => !origFolders.has(f));
    const [_, firstName, lastName, ...rest] = z.filename.split('-');
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
