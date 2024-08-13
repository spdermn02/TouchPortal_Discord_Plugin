// This script is used to build the entry.tp file from a .js file
// EXAMPLE USAGE: node buildentry.js entry.js 

const fs = require('fs');
let warnings = [];

// Function to read the JavaScript file
const readJSFile = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Error reading file from disk: ${err}`);
        process.exit(1);
    }
};

// Initialize the categories array
const initializeCategories = (TP_PLUGIN_CATEGORIES) => {
    let categoriesArray = [];
    for (let key in TP_PLUGIN_CATEGORIES) {
        let category = TP_PLUGIN_CATEGORIES[key];
        category.connectors = [];
        category.actions = [];
        category.events = [];
        category.states = [];
        categoriesArray.push(category);
    }
    return categoriesArray;
};

// Process each item type and update the categories array
const processItems = (categoriesArray, items) => {
    const seenIds = {
        actions: new Set(),
        states: new Set(),
        events: new Set(),
        connectors: new Set()
    };

    for (let itemType of items) {
        for (let itemIndex in itemType.data) {
            let item = itemType.data[itemIndex];
            let category = categoriesArray.find(cat => cat.name === item.category);

            if (category) {
                if (seenIds[itemType.type].has(item.id)) {
                    warnings.push(`Warning: Duplicate ID "${item.id}" found for ${itemType.type.slice(0, -1)} at index "${itemIndex}".`);
                    continue;
                }

                seenIds[itemType.type].add(item.id);
                delete item.category;

                if (itemType.type === 'actions') {
                    category.actions.push(item);
                } else if (itemType.type === 'states') {
                    category.states.push(item);
                } else if (itemType.type === 'events') {
                    category.events.push(item);
                } else if (itemType.type === 'connectors') {
                    category.connectors.push(item);
                }
            } else {
                warnings.push(`Warning: Category "${item.category}" not found for ${itemType.type.slice(0, -1)} with ID "${item.id}" and index "${itemIndex}".`);
            }
        }
    }
};

// Display Warning Messages for User
const displayWarnings = () => {
    const colorizeText = (text, colorCode) => `\x1b[${colorCode}m${text}\x1b[0m`;
    console.warn(colorizeText(`Total warnings: ${warnings.length}`, "31"));
    
    for (let warning of warnings) {
        console.warn(warning);
    }
};

// Ask user if they want to continue
const askForContinue = () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve, reject) => {
        readline.question('Do you want to continue? (y/n) ', (answer) => {
            readline.close();
            if (answer === 'y') {
                resolve();
            } else {
                reject();
            }
        });
    });
};

// Combine all the information into a single JSON object
const combineInfo = (TP_PLUGIN_INFO, TP_PLUGIN_SETTINGS, categoriesArray) => {
    return {
        "sdk": TP_PLUGIN_INFO.sdk,
        "version": TP_PLUGIN_INFO.version,
        "TPDiscord_Version": TP_PLUGIN_INFO.TPDiscord_Version,
        "name": TP_PLUGIN_INFO.name,
        "id": TP_PLUGIN_INFO.id,
        "plugin_start_cmd_windows": TP_PLUGIN_INFO.plugin_start_cmd_windows,
        "plugin_start_cmd_mac": TP_PLUGIN_INFO.plugin_start_cmd_mac,
        "plugin_start_cmd_linux": TP_PLUGIN_INFO.plugin_start_cmd_linux,
        "configuration": TP_PLUGIN_INFO.configuration,
        "settings": TP_PLUGIN_SETTINGS,
        "categories": categoriesArray
    };
};

// Write the JSON object to a file
const writeToFile = (jsonString) => {
    fs.writeFile('./base/entry.tp', jsonString, (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("File has been created");
    });
};

// Main function
const main = (filePath = 'entry.js') => {
    // Read the JavaScript file
    const fileContent = readJSFile(filePath);

    // Create a new function to evaluate the file content in a new scope
    const script = new Function(fileContent + `
        return {
            TP_PLUGIN_CATEGORIES,
            actions,
            states,
            events,
            connectors,
            TP_PLUGIN_INFO,
            TP_PLUGIN_SETTINGS
        };
    `);

    // Execute the script to get the variables
    const {
        TP_PLUGIN_CATEGORIES,
        actions,
        states,
        events,
        connectors,
        TP_PLUGIN_INFO,
        TP_PLUGIN_SETTINGS
    } = script();

    // Initialize categories
    const categoriesArray = initializeCategories(TP_PLUGIN_CATEGORIES);

    // Define items
    const items = [
        { type: 'actions', data: actions },
        { type: 'states', data: states },
        { type: 'events', data: events },
        { type: 'connectors', data: connectors }
    ];

    // Process items
    processItems(categoriesArray, items);

    // Combine information
    const combinedJSON = combineInfo(TP_PLUGIN_INFO, TP_PLUGIN_SETTINGS, categoriesArray);

    // Convert the combined object to a JSON string
    const jsonString = JSON.stringify(combinedJSON, null, 4);

    if (warnings.length > 0){
        displayWarnings();
        askForContinue().then(() => {
            // Write to tppentry.tp file
            writeToFile(jsonString);
        }).catch(() => {
            console.log('Operation cancelled.');
        });
    } else {
        // Write to tppentry.tp file
        writeToFile(jsonString);
    }
};

// Execute the main function with command-line arguments or default value
const args = process.argv.slice(2);
main(args[0]);
