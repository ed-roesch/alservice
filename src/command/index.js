const { exec, spawn } = require('child_process');
const _ = require('lodash');
const Q = require('q');
const debug = require('../debug');
const config = require('../config');

class Command {
  /**
   * Run a process
   * 
   * @param {string} command
   * @param {object} options
   * @param {function} close
   */
  run(command, options, close) {
    if (config.log === 'debug' || config.log === 'verbose') {
      debug.log(
        'Running Command', 'gray',
        command, 'cyan'
      );
    }

    // Split command into words
    let cmd = command.split(' ');
    // First word is the command
    let proc_name = cmd[0];
    // Rest of words are arguments
    cmd.splice(0, 1);
    let proc_args = cmd;

    // Process
    let proc = spawn(proc_name, proc_args, {
      shell: true,
      // detached: true,
      env: {
        PATH: process.env.PATH,
        HOME: '~/'
      },
      stdio: 'inherit',
      ...options
    });

    // Text chunks
    // proc.stdout.setEncoding('utf8');
    // proc.stderr.setEncoding('utf8');

    // proc.stdout.on('data', (chunk) => {
    //   // data from standard output
    //   if (_.isFunction(stdout)) {
    //     stdout(chunk);
    //   }
    // });

    // proc.stderr.on('data', (chunk) => {
    //   // data from error output
    //   if (_.isFunction(stderr)) {
    //     stderr(chunk);
    //   }
    // });

    proc.on('close', (code) => {
      // process is complete
      if (_.isFunction(close)) {
        close(code);
      }
    });
  }

  /**
   * Run a process, output to a log file
   * 
   * @param {string} command
   * @param {object} options
   * @param {function} close
   */
  runLog(command, options, close) {
    if (config.log === 'debug' || config.log === 'verbose') {
      debug.log(
        'Running Command', 'gray',
        command, 'cyan'
      );
    }

    // Append log path
    command += ` > ${options.log_path}`;
    // Split command into words
    let cmd = command.split(' ');
    // First word is the command
    let proc_name = cmd[0];
    // Rest of words are arguments
    cmd.splice(0, 1);
    let proc_args = cmd;

    // Process
    let proc = spawn(proc_name, proc_args, {
      shell: true,
      env: {
        PATH: process.env.PATH
      },
      ...options
    });

    proc.on('close', (code) => {
      // process is complete
      if (_.isFunction(close)) {
        close(code);
      }
    });
  }

  /**
   * Silently run a process and return complete data
   * 
   * @param {string} command
   * @param {object} options
   * @return {Promise}
   */
  runSilent(command, options) {
    let deferred = Q.defer();

    exec(command, options, (err, stdout, stderr) => {
      if (config.log === 'verbose' && !_.isEmpty(stdout)) {
        debug.log(
          'Command', 'gray',
          command, 'white',
          'standard output', 'green'
        );
        console.info(stdout);
      }

      if (config.log === 'verbose' && !_.isEmpty(stderr)) {
        debug.log(
          'Command', 'gray',
          command, 'white',
          'error output', 'red'
        );
        console.error(stderr);
      }

      deferred.resolve({
        stdout: stdout,
        stderr: stderr
      });
    });

    return deferred.promise;
  }
}

module.exports = Command;
