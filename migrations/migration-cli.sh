#!/bin/bash
# Creates enviroments variable for apply
# By default run should be DRY, meaning not appling change to DB only print changes
# Creates options select from migration revision and run selected file

unset RUN_WITH_APPLY
# Ask if to set RUN_WITH_APPLY, new scripts should NOT change DB if run is withoung this flag
read -p "Apply migration?
If yes, migration will run with RUN_WITH_APPLY=true enviromental variable. (y/n):" choice
case "$choice" in 
    y|Y ) export RUN_WITH_APPLY="true";;
esac

# List 
echo '\n Select migration revision to run.'
PS3='Please enter number of migration to run: '
options=( $(find ./migrations/release/ -maxdepth 1 -type f -name "*.sh" -print0 | sort -z | xargs -0) )
select opt in "${options[@]}"
do
    echo "Miration file to run:"
    echo $opt
    echo '\nMiration scripts to run:'
    cat $opt

    read -p "Following migration will run (y/n):" choice
    case "$choice" in 
        y|Y ) sh $opt;;
        * ) echo "Canceled";;
    esac
    break
done

