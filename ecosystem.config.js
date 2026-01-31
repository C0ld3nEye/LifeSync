module.exports = {
    apps: [
        {
            name: "lifesync-web",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
            },
        },
        {
            name: "lifesync-scheduler",
            script: "./scripts/scheduler.js",
            watch: ["scripts/scheduler.js"], // Restart if script changes
            env: {
                NODE_ENV: "production",
            },
        }
    ],
};
