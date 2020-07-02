const commandLineArgs = require("command-line-args");

const { getAssessment, getCohort } = require("./src/command");
const { createTmpDir, extractEachZip, getAllZipFiles } = require("./src/files");
const { buildSubmissionsPath, scpZipFilesToDir } = require("./src/server");

let students = null;
try {
  students = require("./students");
} catch (e) {
  console.warn(
    "no array of students found. Downloading assessments for all students. You can speficy your advisees by putting their names in an array in a students.js file. Example: const students = ['fname lname'];"
  );
}

const optionDefinitions = [
  { name: "cohort", alias: "c", type: String },
  { name: "assessment", alias: "a", type: String }
];

const commandLineOptions = commandLineArgs(optionDefinitions);
const pwd = __dirname;
const submissionsBasePath = ["home", "ubuntu", "sis", "media", "submissions"];
const scpUserName = "ubuntu";
const serverName = "sis.rithmschool.com";

const tempDir = createTmpDir(pwd);
const cohort = getCohort(commandLineOptions.cohort);
const assessment = getAssessment(commandLineOptions.assessment);
scpZipFilesToDir(
  scpUserName,
  serverName,
  buildSubmissionsPath(submissionsBasePath, cohort, assessment),
  tempDir.fullPath
);

const zips = getAllZipFiles(tempDir.fullPath);
extractEachZip(zips, assessment, tempDir.fullPath, pwd, students);
