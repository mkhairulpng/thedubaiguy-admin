#!/bin/bash
set -e
cd "$(dirname "$0")"
export VERCEL_ORG_ID="team_YP4yVzYg5tOftOyRsKvRdnup"
export VERCEL_PROJECT_ID="prj_uLIMPwRp761iITghkSuTjjzja89b"
echo "TheDubaiGuy Admin — Vercel Production deployment"
echo "Project: prj_uLIMPwRp761iITghkSuTjjzja89b"
echo
echo "This command never prints or uploads environment secrets."
echo
npx --yes vercel@latest --prod
status=$?
if [ $status -eq 0 ]; then
  echo
  echo "Deployment command completed successfully. Verify the Production deployment in Vercel before using the custom domain."
else
  echo
  echo "Deployment command failed with exit code $status. No claim of deployment success is made."
fi
read -n 1 -s -r -p "Press any key to close..."
echo
exit $status
