#!/bin/bash
# For developement runs last planed migration revison in DRY mode

unset RUN_WITH_APPLY
lastVerstion=$(ls ./migrations/release/ -v | tail -n 1)
echo 'Script to run without RUN_WITH_APPLY flag:'
echo $lastVerstion
cat ./migrations/release/$lastVerstion

read -p "Following migration will run (y/n):" choice
case "$choice" in 
    y|Y ) sh ./migrations/release/$lastVerstion;;
    * ) echo "Canceled";;
esac
