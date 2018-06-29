const Q = require('q');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

/**
 * Config object
 */
let cfg = {
  env: 'stage4',
  log: 'info',
  clean: false,
  path: {}
};

class ConfigCheck {
  /**
   * Start config check
   * 
   * @return {Promise}
   */
  static start() {
    let deferred = Q.defer();

    fs.stat(`${__dirname}/../../config.json`, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Config file doesn't exist
          Q.when(this.makeConfig()).then(() => {

            deferred.resolve();

          }, (err) => {
            console.error('Error making config file', err);
            deferred.reject(err);
          });
        } else {
          // Unknown error occurred
          console.error('Unknown Error', err);
          deferred.reject(err);
        }
      } else {
        deferred.resolve(stats);
      }
    });

    return deferred.promise;
  }

  /**
   * Make the config file
   * 
   * @return {Promise}
   */
  static makeConfig() {
    let deferred = Q.defer();
    let parent_path = path.join(__dirname, '..', '..', '..');

    let question_repo_path = {
      name: 'repo_path',
      message: `What is the path to your repositories?`,
      default: parent_path
    };

    let question_log_level = {
      name: 'log',
      type: 'rawlist',
      message: `Log output`,
      choices: [
        'info',
        'debug',
        'verbose'
      ]
    };

    let question_environment = {
      name: 'env',
      message: `What environment to build against?`,
      default: cfg.env
    };

    inquirer.prompt([
      question_repo_path,
      question_environment,
      question_log_level
    ]).then(answers => {
      if (answers.env) {
        cfg.env = answers.env;
      }

      if (answers.log) {
        cfg.log = answers.log;
      }

      if (answers.repo_path) {
        cfg.path.repos = this.removeTrailing(answers.repo_path);
      }

      // Write the config file
      Q.when(this.saveConfig(cfg)).then(() => {
        // Config saved
        deferred.resolve();
      }, (err) => {
        // Config not saved
        deferred.reject(err);
      });
    });

    // deferred.resolve();

    return deferred.promise;
  }

  /**
   * Save config.json file
   * 
   * @param {object} config
   * @return {Promise}
   */
  static saveConfig(config) {
    let deferred = Q.defer();
    let config_path = path.join(__dirname, '..', '..', 'config.json');

    fs.writeFile(config_path, JSON.stringify(config, null, 2), (err) => {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve();
      }
    });

    return deferred.promise;
  }

  /**
   * Remove trailing slashes
   * 
   * @param {string} check_path
   * @return {string}
   */
  static removeTrailing(check_path) {
    // Check last character of path
    const last_char = check_path.substr(check_path.length - 1);
    
    if (last_char === path.sep) {
      // Remove the trailing slash
      return check_path.substring(0, check_path.length - 1);
    }

    return check_path;
  }
}

module.exports = ConfigCheck;
