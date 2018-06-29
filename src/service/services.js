const _ = require('lodash');
const Q = require('q');
const inquirer = require('inquirer');
const Service = require('./index');
const Command = require('../command');
const debug = require('../debug');
const config = require('../config');
let services = require('../../services');


class Services {
  /**
   * Initialize services
   * 
   */
  constructor() {
    // Services
    this.svc = [];

    services.forEach((data) => {
      let service = new Service(data);

      _.each(config.path, (path, name) => {
        if (name === service.name) {
          // Set the path for the service based off config value
          service.path = path;
        }
      });

      // if (_.isUndefined(service.path) || _.isEmpty(service.path)) {
      //   // Service does not have a path
      //   debug.log(
      //     'Service path is empty', 'red'
      //   );
      // }

      // Add service to list of services
      this.svc.push(service);
    });
  }

  /**
   * Kill all services that might be running
   * 
   * @return {Promise}
   */
  kill() {
    let deferred = Q.defer();
    let cmd = new Command();

    Q.when(cmd.runSilent('screen -ls', {})).then((data) => {
      const screen_list = data.stdout;
      // Services to kill
      let services_to_kill = [];

      // debug.log(
      //   'Services', 'magenta',
      //   'Stopping all...', 'yellow'
      // );

      this.svc.forEach((service) => {
        if (screen_list.indexOf(service.name) >= 0) {
          // Service is running
          // Add to list of services to kill
          services_to_kill.push(service.killScreenSession());
        }
      });

      Q.allSettled(services_to_kill).then(() => {
        // All Services have been killed
        // debug.log(
        //   'Services', 'magenta',
        //   'Stopped', 'green'
        // );

        deferred.resolve();
      });

    });

    return deferred.promise;
  }

  /**
   * Check if the services we are about to run have paths
   * 
   * @param {array} services
   * @return {Promise}
   */
  checkPaths(services) {
    let deferred = Q.defer();
    // Get paths for services
    let service_paths_queue = _.clone(services);

    /**
     * Fetch next path in the queue
     */
    let dequeue = () => {
      let service = service_paths_queue[0];

      if (_.isUndefined(service)) {
        // No more paths to dequeue
        deferred.resolve();
        return deferred.promise;
      }

      Q.fcall(service.getPath)
        .then(service.checkPath)
        .then(path_exists => {
          let deferred = Q.defer();

          if (!path_exists) {
            // Path does not exist
            service.exists = false;

            let question_git_clone = {
              name: 'git_clone',
              message: `${service.name} not found. Clone from ${service.repository} into ${service.path}?`,
              default: 'yes'
            };
        
            inquirer.prompt([
              question_git_clone
            ]).then(answers => {
              if (answers.git_clone === 'yes' || answers.git_clone === 'y') {
                // Clone service repository
                deferred.resolve(true);
              } else {
                // Do not clone service repository
                deferred.resolve(false);
              }
            });
          } else {
            // Path exists
            service.exists = true;
            deferred.resolve(false);
          }

          return deferred.promise;
        })
        .then(clone_service => {
          let deferred = Q.defer();
          
          if (clone_service) {
            // Clone
            Q.when(service.gitClone()).then(() => {
              // Service cloned
              if (service.is_npm) {
                // Service is an npm module, run installation steps
                service.do_npm_install = true;
              }

              if (service.is_ion) {
                // Link ion
                service.do_npm_link = true;
              }

              deferred.resolve(true);
            });
          } else {
            // Do not clone
            if (!service.exists) {
              // Service does not exist and was not cloned
              debug.log(
                service.name, 'cyan',
                'was not found and cannot be run', 'red'
              );

              deferred.resolve(false);
              
            } else {
              // Service exists
              deferred.resolve(true);
            }
          }

          return deferred.promise;
        })
        .then(run_next => {
          if (run_next) {
            // Run next queue
            nextQueue();
          }
        })
        .catch((err) => {
          console.error(err);
        });

      // Q.when(service.getPath)
      //   .then(service.checkPath)
      //   .then((path_exists) => {
      //     if (!path_exists && !_.isEmpty(service.repository)) {
      //       // Path does not exist
      //       let question_git_clone = {
      //         name: 'git_clone',
      //         message: `${service.name} not found. Clone from ${service.repository} into ${service.path}?`,
      //         default: 'yes'
      //       };
        
      //       inquirer.prompt([
      //         question_git_clone
      //       ]).then(answers => {
      //         if (answers.git_clone === 'yes' || answers.git_clone === 'y') {
      //           // Clone service repository
      //           Q.when(service.gitClone).then(() => {
      //             // Clone complete
      //             nextQueue();
      //           });
      //         } else {
      //           // Do not clone service repository
      //           nextQueue();
      //         }
      //       });
      //     } else {
      //       // Path exists
      //       nextQueue();
      //     }

      // }, (err) => {
      //   console.error(`Error fetching path for ${service.name}: ${err}`);
      //   deferred.reject(err);
      // });
    }

    /**
     * Remove queue item and run next queue
     */
    let nextQueue = () => {
      service_paths_queue.splice(0, 1);

      // Dequeue next path
      dequeue();
    };

    // Fetch paths
    dequeue();

    return deferred.promise;
  }

  /**
   * Get the branches of the services we are about to run
   * 
   * @param {array} services
   * @return {Promise}
   */
  getBranches(services) {
    let deferred = Q.defer();
    // Get branches for services
    let service_branches = [];

    services.forEach((service) => {
      // Add to list of services to kill
      service_branches.push(service.getBranch());
    });

    Q.allSettled(service_branches).then(() => {
      // All Services have branches returned
      // debug.log(
      //   'Services', 'magenta',
      //   'Branches Fetched', 'green'
      // );

      deferred.resolve();
    });

    return deferred.promise;
  }
}

module.exports = Services;
