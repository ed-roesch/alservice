const moment = require('moment');
const chalk = require('chalk');

module.exports = {
    /**
     * Log a console message using the chalk package
     * Usage: log('My message!', 'yellow', 'My second message!', 'green')
     */
    log: function() {
        var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
        var logMsg = '';
        var timestamp = moment().format('hh:mm:ss A');
        // Show timestamp by default
        var show_timestamp = true;

        if (args[0] === 'timestamp:exclude') {
            // Do not show timestamp
            show_timestamp = false;

            // Remove timestamp argument
            args.splice(0, 1);
        }

        if (args.length % 2 === 0) {
            for (var i = 0; i < args.length; i++) {
                if (i % 2 === 0) {
                    var message = args[i];
                    var color = args[i + 1];

                    logMsg += chalk[color](message) + ' ';
                }
            }

            if (show_timestamp) {
                console.info(chalk.gray('[' + timestamp + ']') + ' ' + logMsg);
            } else {
                console.info(logMsg);
            }

        } else {
            this.log(args[0], 'white');
        }
    },

    /**
     * Separator line between log messages
     */
    separator: function() {
        var timestamp = moment().format('hh:mm:ss A');

        console.info(chalk.gray('[' + timestamp + '] --------------------'));
    }
}