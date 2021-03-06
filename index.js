#!/usr/bin/env node
const { readdir, lstat, readFileSync, writeFileSync, mkdirSync, existsSync } = require("fs");
const PromptSync = require("prompt-sync")();

let allMethodRegex = /^Given|When|Then|And|But/;
let allMethodGlobalRegex = /^Given|When|Then|And|But/g;
let everythingAfterSlashRegex = /[\/\\][\w-]+\.\w+/;
let fileNameRegex = /(?<=[\/\\])\w+(?=\.\w+)/;
let variableRegex = /\".*?\"/;
let isFeatureFile = false;
const path = process.argv[2];


const readFeature = (featurePath) => {
    return readFileSync(featurePath);
};

const writeSpec = (featureName, specsToWrite, dirPath) => {
    dirPath = `${dirPath}/${featureName}`;
    specsToWrite = specsToWrite.reduce((acc, val) => {
        if (typeof acc === "string") {
            acc = [acc]
        }
        val = val.replace(variableRegex, "{string}")
        if (!acc.includes(val)) {
            acc.push(val);
        }
        return acc;
    });
    let methodRegisters = specsToWrite.join("\n").match(allMethodGlobalRegex).reduce((acc, val) => {
        if (typeof acc === "string") {
            acc = [acc]
        }
        if (!acc.includes(val)) {
            acc.push(val);
        }
        return acc;
    }).join(", ")
    let writeString = `import { ${methodRegisters} } from "cypress-cucumber-preprocessor/steps"\n`
    specsToWrite.forEach(spec => {
        let method = spec.match(allMethodRegex)[0];
        spec = spec.replace(allMethodRegex, "").trim();
        writeString += `
${method}("${spec}", (${spec.includes("{string}") ? "VARIABLE_NAME_HERE" : ""}) => {
    //Add Implement Here
    throw new Error("Unimplemented Method")
})\n`
    })
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath);
    }
    if (existsSync(`${dirPath}/${featureName}.js`)) {
        const answer = PromptSync(`Spec already exists for ${featureName}. Would you like to override it? Y/N\n`);
        if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
            writeFileSync(`${dirPath}/${featureName}.js`, writeString);
        } else {
            console.log(`Skipping ${featureName}`);
        }
    } else {
        writeFileSync(`${dirPath}/${featureName}.js`, writeString);
    }
}

lstat(path, (err, fileStats) => {
    if (err) {
        console.error(err);
        return;
    }
    if (fileStats.isDirectory()) {
        readdir(path, (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            files.forEach((file) => {
                if (file.endsWith(".feature")) {
                    isFeatureFile = true;
                    let specsToWrite = readFeature(file).toString().split("\n").map(val => val.trim()).filter(val => allMethodRegex.test(val));
                    writeSpec(file.match(fileNameRegex)[0], specsToWrite, `${path}`);
                }
            });
            if (!isFeatureFile) {
                throw new Error("Directory has no feature files in it");
            }
        });
    } else {
        if (path.endsWith(".feature")) {
            let specsToWrite = readFeature(path).toString().split("\n").map(val => val.trim()).filter(val => allMethodRegex.test(val));
            writeSpec(path.match(fileNameRegex)[0], specsToWrite, path.replace(everythingAfterSlashRegex, ""));
        } else {
            throw new Error("Path is a file, but not a feature file");
        }
    }
});