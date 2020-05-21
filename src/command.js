/**
 * Validate the assessment id (e.g. web-dev-1)
 *
 * If there is no assessment id provided via the command line, exit out
 *
 * @param {String} commandLineCohort
 */
function getAssessment(commandLineAssessment) {
  if (!commandLineAssessment) {
    console.error(
      "The assessment was invalid or not set. " +
        "Remember to add the --assessment flag or -a for short"
    );
    process.exit(1);
  }
  return commandLineAssessment;
}

/**
 * Find and validate the Rithm cohort id (e.g. r16)
 *
 * Checks the process.env, then the command line, then prompt
 *
 * @param {String} commandLineCohort
 */
function getCohort(commandLineCohort) {
  let val;
  if (commandLineCohort) {
    val = commandLineCohort;
  } else if (process.env.RITHM_COHORT) {
    val = process.env.RITHM_COHORT;
  } else {
    val = prompt(
      "You do not have the RITHM_COHORT environment variable set. " +
        "What is your cohort? (example: r11)"
    );
  }

  if (val && val.match(/^r\d{1,2}$/g)) {
    return val;
  } else {
    console.error(
      "The rithm cohort was invalid or not set. " +
        "Remember to set an environment variable like RITHM_COHORT=r11"
    );
    process.exit(1);
  }
}

module.exports = {
  getAssessment,
  getCohort
};
