const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const opts = {
    filename: __dirname+'/logs/my-app.log',
    maxSize: 100 * 1024 * 1024, // 100MB
    rotateInterval: '1d' // Rotate the log file once per day
};

const loggerObj = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: {service: 'user-service'},
    transports: [
        new winston.transports.File({filename: 'error.log', level: 'error'}),
        new winston.transports.File({filename: 'combined.log'}),
    ],
});

function logger(message = '', type = 'error') {
    loggerObj.configure({
        level: 'verbose',
        transports: [
            new DailyRotateFile(opts)
        ]
    });
    return loggerObj.log({
        level: type,
        message
    })
}

module.exports.logger = logger