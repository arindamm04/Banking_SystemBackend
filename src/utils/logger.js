const timestamp = () => new Date().toISOString();

const write = (level, ...args) => {
    const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;

    if (level === "error") {
        console.error(prefix, ...args);
    } else if (level === "warn") {
        console.warn(prefix, ...args);
    } else {
        console.log(prefix, ...args);
    }
};

export const logger = {
    info: (...args) => write("info", ...args),
    warn: (...args) => write("warn", ...args),
    error: (...args) => write("error", ...args),
    debug: (...args) => {
        if (process.env.NODE_ENV !== "production") {
            write("debug", ...args);
        }
    },
};
