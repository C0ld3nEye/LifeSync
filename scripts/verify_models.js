
const apiKey = 'AIzaSyDQEiCC-uiO83hUU67zl_KcTkP2SQBnd2A';
const fs = require('fs');

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const modelNames = data.models.map(m => `- ${m.name} (${m.displayName})`).join('\n');
        fs.writeFileSync('models_list.txt', modelNames);
        console.log("Model list written to models_list.txt");
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
