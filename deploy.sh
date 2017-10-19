#!/bin/bash

set -e # exit with nonzero exit code if anything fails

if [[ $TRAVIS_BRANCH == "master" && $TRAVIS_PULL_REQUEST == "false" ]]; then

echo "Starting to update ${GH_REPO}"

#copy data we're interested in to other place
cp -R bin/site $HOME/site

#go to home and setup git
cd $HOME
git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis"

echo "Cloning the repo..."
git clone https://${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO} repo

echo "Copying the site files..."
cd repo
cp -Rf $HOME/site/* .

echo "Creating a new commit..."
git add -f .
git commit -m "Travis build $TRAVIS_BUILD_NUMBER"

echo "Pushing changes..."
git push

echo "Done updating ${GH_REPO}"

else
 echo "Skipped updating ${GH_REPO}, because build is not triggered from the master branch."
fi;