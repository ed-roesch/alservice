const Q = require('q');
const _ = require('lodash');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const ConfigCheck = require('../config/config-check');
const Command = require('../command');
const debug = require('../debug');
const config = require('../config');

class Service {
  constructor(data) {
    this.name = data.name;
    this.path = data.path;
    this.is_npm = data.is_npm ? true : false;
    this.is_ion = data.is_ion ? true : false;
    this.do_clear_node_modules = data.do_clear_node_modules ? true : false;
    this.do_npm_install = data.do_npm_install ? true : false;
    this.do_npm_link = data.do_npm_link ? true : false;
    // Start npm service with environment variable
    this.start_with_env = data.start_with_env ? true : false;
    this.repository = data.repository || '';
    this.run = data.run ? true : false;

    this.checkPath = this.checkPath.bind(this);
    this.getPath = this.getPath.bind(this);
    this.gitClone = this.gitClone.bind(this);
    this.killScreenSession = this.killScreenSession.bind(this);
    this.handleNodeModules = this.handleNodeModules.bind(this);
    this.handleNpmInstall = this.handleNpmInstall.bind(this);
    this.handleNpmLink = this.handleNpmLink.bind(this);
    this.handleParentNpmLink = this.handleParentNpmLink.bind(this);
    this.start = this.start.bind(this);
  }

  /**
   * Start the service
   * 
   * @return {Promise}
   */
  start(is_restart = false) {
    let deferred = Q.defer();
    let cmd = new Command();
    // Run command to use
    // let run = config.log === 'info' ? cmd.runLog : cmd.run;
    let run = cmd.run;
    const log_path = path.join(__dirname, '..', '..', 'logs', `${this.name}.log`);

    debug.log(
      this.name, 'cyan',
      `${!is_restart ? 'Starting' : 'Restarting'} service...`, 'yellow',
    );

    // cmd.run(`screen -dmS ${this.name} npm start${this.start_with_env ? ` ${config.env}` : ''} &> ${this.name}.log`, {
    run(`npm start${this.start_with_env ? ` ${config.env}` : ''}`, {
      cwd: this.path,
      log_path: log_path
    }, (code) => {
      // process has quit
      debug.log(
        this.name, 'cyan',
        'has quit', 'red'
      );

      // attempt to restart the service
      this.start(true);

      deferred.resolve();

    });

    return deferred.promise;
  }

  /**
   * Kill the services screen session if one exists
   * 
   * @return {Promise}
   */
  killScreenSession() {
    let deferred = Q.defer();
    let cmd = new Command();

    if (config.log === 'debug' || config.log === 'verbose') {
      debug.log(
        this.name, 'cyan',
        'Removing screen session...', 'yellow',
      );
    }

    cmd.run(`screen -X -S ${this.name} quit`, {}, () => {
      // process is complete
      if (config.log === 'debug' || config.log === 'verbose') {
        debug.log(
          this.name, 'cyan',
          'Removed screen session', 'green',
        );
      }

      deferred.resolve();
    });

    return deferred.promise;
  }

  /**
   * Clone service from repository into its path
   * 
   * @return {Promise}
   */
  gitClone() {
    let deferred = Q.defer();
    let cmd = new Command();

    if (config.log === 'debug' || config.log === 'verbose') {
      debug.log(
        this.name, 'cyan',
        `cloning ${this.repository}`, 'yellow'
      );
    }

    cmd.run(`git clone ${this.repository} ${this.path}`, {}, () => {
      // process is complete
      if (config.log === 'debug' || config.log === 'verbose') {
        debug.log(
          this.name, 'cyan',
          'cloned', 'green',
        );
      }

      deferred.resolve();
    });

    return deferred.promise;
  }

  /**
   * Get the branch the user is on
   * 
   * @return {Promise}
   */
  getBranch() {
    let deferred = Q.defer();
    let cmd = new Command();

    cmd.runSilent(`git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \\(.*\\)/\\1/'`, {
      cwd: this.path
    }).then((result) => {
      // process is complete
      // branch name
      this.branch = !_.isEmpty(result.stdout) ? result.stdout.replace(/\n/g, '') : '';

      deferred.resolve();
    });

    return deferred.promise;
  }

  /**
   * Check the path the service is in
   * 
   * @return {Promise}
   */
  checkPath() {
    let deferred = Q.defer();

    fs.stat(this.path, (err, stats) => {
      if (err && err.code === 'ENOENT') {
        // Path does not exist
        deferred.resolve(false);
      } else {
        // Path exists
        deferred.resolve(true);
      }
    });

    return deferred.promise;
  }

  /**
   * Get the path the service is in
   * 
   * @return {Promise}
   */
  getPath() {
    let deferred = Q.defer();

    if (!_.isEmpty(this.path)) {
      // Path is configured
      deferred.resolve();

    } else {
      // Path is not configured
      let question_path = {
        name: 'path',
        message: `What is the path to ${this.name}?`,
        default: `${config.path.repos}/${this.name}`
      };

      inquirer.prompt([
        question_path
      ]).then(answers => {
        if (answers.path) {
          // Save service path
          this.path = ConfigCheck.removeTrailing(answers.path);
          config.path[this.name] = ConfigCheck.removeTrailing(answers.path);
        }

        Q.when(ConfigCheck.saveConfig(config)).then(() => {
          // Config saved
          deferred.resolve();

        }, (err) => {
          // Config not saved
          deferred.reject(err);
        });
      });
    }

    return deferred.promise;
  }

  /**
   * Remove node_modules directory of a service
   * 
   * @return {Promise}
   */
  handleNodeModules() {
    let deferred = Q.defer();

    if (this.do_clear_node_modules) {
      // Remove node_modules
      let cmd = new Command();

      debug.log(
        this.name, 'cyan',
        'Removing node_modules...', 'yellow',
      );

      cmd.run(`rm -rf ${this.path}/node_modules`, {}, (code) => {
        // process is complete
        debug.log(
          this.name, 'cyan',
          'Removed node_modules', 'green',
        );

        deferred.resolve();
      });

    } else {
      // Do not remove node_modules
      debug.log(
        this.name, 'cyan',
        'Skipping node_modules removal', 'gray',
      );

      deferred.resolve();
    }

    return deferred.promise;
  }

  /**
   * Install npm modules
   * 
   * @return {Promise}
   */
  handleNpmInstall() {
    let deferred = Q.defer();

    if (this.do_npm_install) {
      // Install node_modules
      let cmd = new Command();

      debug.log(
        this.name, 'cyan',
        'Installing dependencies...', 'yellow',
      );

      cmd.run(`npm install${config.log !== 'verbose' ? ' --silent' : ''}`, {
        cwd: this.path
      }, (code) => {
        // process is complete
        debug.log(
          this.name, 'cyan',
          'Installed dependencies', 'green',
        );

        deferred.resolve();
      });
      
    } else {
      // Do not install node_modules
      debug.log(
        this.name, 'cyan',
        'Skipping dependency installation', 'gray',
      );

      deferred.resolve();
    }

    return deferred.promise;
  }

  /**
   * Link npm module
   * 
   * @return {Promise}
   */
  handleNpmLink() {
    let deferred = Q.defer();

    if (this.do_npm_link) {
      // Link module
      let cmd = new Command();

      debug.log(
        this.name, 'cyan',
        'Linking module...', 'yellow',
      );

      cmd.run(`npm link${config.log !== 'verbose' ? ' --silent' : ''}`, {
        cwd: this.path
      }, (code) => {
        // process is complete
        debug.log(
          this.name, 'cyan',
          'Linked module', 'green',
        );

        deferred.resolve();
      });
      
    } else {
      // Do not link module
      debug.log(
        this.name, 'cyan',
        'Skipping module link', 'gray',
      );

      deferred.resolve();
    }

    return deferred.promise;
  }

  /**
   * Link associated npm modules to parent
   * 
   * @param {array} services
   * @return {Promise}
   */
  handleParentNpmLink(services) {
    let deferred = Q.defer();

    if (this.name === 'member-app' || this.name === 'office-app') {
      // Queue of commands to run
      let link_command_queue = [];
      // Number of services to link to the parent service
      let num_services_to_link = 0;

      services.forEach((service) => {
        if (service.is_ion) {
          // Link service ion to this parent service
          link_command_queue.push({
            parent_service_name: this.name,
            child_service_name: service.name,
            path: this.path,
            run: `npm link ${service.name} ${config.log !== 'verbose' ? ' --silent' : ''}`
          });
          num_services_to_link++;
        }
      });

      // dequeue link command
      let dequeue = () => {
        // Link module to parent
        let cmd = new Command();
        let command = link_command_queue[0];

        if (_.isUndefined(command)) {
          // No more commands to dequeue
          deferred.resolve();
          return deferred.promise;
        }

        debug.log(
          this.name, 'cyan',
          'Linking', 'yellow',
          command.child_service_name, 'magenta',
          'to', 'gray',
          command.parent_service_name, 'magenta'
        );

        cmd.run(command.run, {
          cwd: command.path
        }, (code) => {
          // process is complete
          debug.log(
            this.name, 'cyan',
            'Linked', 'green',
            command.child_service_name, 'magenta',
            'to', 'gray',
            command.parent_service_name, 'magenta'
          );
 
          // Remove from queue
          link_command_queue.splice(0, 1);

          // Dequeue next command
          dequeue();
        });
      }

      // Begin dequeueing commands
      dequeue();
      
    } else {
      // Do not link parent modules
      deferred.resolve();
    }

    return deferred.promise;
  }
}

module.exports = Service;
