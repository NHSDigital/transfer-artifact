#!/bin/bash
echo "=========================== Gitleaks ReadMe ===============================
To exclude false postives add a git commit or regex allow rule to the bottom of the gitleaks.toml
file including a commented out match for reference.

Example config to allowing a false positive:
commits = [
  \"9c438d02d6764badeb34182c2c7a446ecf240482\", #\"Match\": \"<Match message here>\"
]"

if [[ "$1" == "--pre-commit" ]]; then
   if ! [ -x "$(command -v gitleaks)" ]; then
      echo -e "\033[33mWarning: Pre-commit test-secrets not run! gitleaks not installed locally.\033[0m"
      echo -e "\033[33mWarning: Please download it from: https://github.com/zricethezav/gitleaks\033[0m"
      exit 1
   fi
   echo -e "==================== Running pre-commit protect scan ======================="
   gitleaks protect --staged --verbose
else
   if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
      commits=$(git rev-parse HEAD~3)..HEAD
   else
      commits=$(git merge-base origin/main HEAD)..HEAD
   fi
   echo -e "================= Running full detect scan on $(git rev-parse --abbrev-ref HEAD) ================="
   gitleaks detect --verbose --redact
fi
