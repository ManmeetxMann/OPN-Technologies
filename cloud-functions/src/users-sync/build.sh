# Clear distrubution folder
rm -rf dist/ 
# Transpile TypeScript
tsc 
# Copy package.json to each function's folder
cp ./package.json ./dist/package.json