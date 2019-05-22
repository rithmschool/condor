# Condor
## A automated assessment downloader

__Usage__

* npm install
* set RITHM_COHORT environment variable to a valid cohort, e.g., export RITHM_COHORT=r11
* Have the rithm pem key added to ssh: `ssh-add rithm-key.pem`
* node condor.js -a react-1  // -a specifies the assessment name
