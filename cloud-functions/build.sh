# Clear distrubution folder
rm -rf dist/ 
# Transpile TypeScript
tsc 
# Copy package.json to each function's folder
find ./dist -type d -exec cp ./package.json {} \;
