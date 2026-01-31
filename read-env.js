const fs = require('fs');
try {
    const content = fs.readFileSync('.env.local', 'utf8');
    console.log(content);
} catch (err) {
    console.error(err);
}
