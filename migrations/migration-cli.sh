#!/bin/bash
# Creates enviroments variable for apply
# By default run should be DRY, meaning not appling change to DB only print changes
# Creates options dialog from migration revisions and scripts
# Logs success and errors to file 

unset RUN_WITH_APPLY
# Ask if to set RUN_WITH_APPLY, new scripts should NOT change DB if run is withoung this flag
read -p "Apply migration?
If yes, migration will run with RUN_WITH_APPLY=true enviromental variable. (y/n):" choice
case "$choice" in 
    y|Y ) export RUN_WITH_APPLY="true";;
esac

# List all migration version in ./migrations/release/ and ask user which version to run
echo '\n Select migration revision to run.'
PS3='Please enter number of migration to run: '
version_options=( $(find ./migrations/release/ -maxdepth 1 -type f -name "*.sh" -print0 | sort -z | xargs -0) )
select version_file in "${version_options[@]}"
do
    echo "Miration file to run:"
    echo $version_file

    # List all scripts in the version 
    # create an array called $menu
    declare -a menu              
    menu[0]=""                  
    # read menu file line-by-line, save as $line
    while IFS= read -r line; do
        menu[${#menu[@]}]="$line"
    done < $version_file

    echo "Please select an option by typing in the corresponding number"
    for (( i=1; i<${#menu[@]}; i++ )); do
        echo "$i) ${menu[$i]}"
    done

    read -p "Please enter number of script to run: " script_index
    script_option=${menu[$script_index]}

    # Run migration script and save logs into a file
    read -p "The script '${script_option}' will run (y/n):" choice


    if [ ! -d ./migration-logs ]; then
        echo 'Creating ./migration-logs folder'
        mkdir -p ./migration-logs;
    fi

    # get file names from full path
    script_filename=$(b=${script_option##*/}; echo ${b%.*})
    version_filename=$(b=${version_file##*/}; echo ${b%.*})
    date_time=$(date +%Y-%m-%d_%H:%M:%S)

    file_name="${version_filename}-${script_filename}-${date_time}"
    echo "Executions logs will be saved in to ./migration-logs/${file_name}-log.txt"

    # run and save logs to files
    case "$choice" in 
        y|Y ) $script_option > migration-logs/${file_name}-log.txt 2> migration-logs/${file_name}-error.txt;;
        * ) echo "Canceled";;
    esac

    break
done
