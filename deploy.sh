#!/bin/bash

set -e # exit with nonzero exit code if anything fails

if [[ $TRAVIS_BRANCH == "master" && $TRAVIS_PULL_REQUEST == "false" ]]; then

echo "Starting to update ${GH_REPO}\n"

#copy data we're interested in to other place
cp -R bin/site $HOME/site

#go to home and setup git
cd $HOME
git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis"

#using token clone master branch
git clone --quiet --branch=master https://${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO}.git repo > /dev/null

#go into directory and copy data we're interested in to that directory
cd repo
cp -Rf $HOME/site/* .

#add, commit and push files
git add -f .
git commit -m "Travis build $TRAVIS_BUILD_NUMBER"
git push > /dev/null

echo "Done updating ${GH_REPO}\n"

else
 echo "Skipped updating ${GH_REPO}, because build is not triggered from the master branch."
fi;