const Q = require('q');
const _ = require('lodash');
const debug = require('./src/debug');
const ConfigCheck = require('./src/config/config-check');

let args;

// Current service job
let service_index = 0;

Q.when(ConfigCheck.start()).then(() => {
  // Config file passes initial check
  start();
});

/**
 * Start the services based on cli input
 */
function start() {
  const Services = require('./src/service/services');
  const Args = require('./src/arguments');
  
  args = new Args(process.argv);

  if (args.services.length > 0) {
    // There are services to run
    const services = new Services();
  
    Q.fcall(() => {
      // return services.kill();
      return services.checkPaths(args.services);
    })
    .then(() => {
      return services.getBranches(args.services);
    })
    .catch((err) => {
      console.error(err);
    })
    .done(() => {
      // All running services have been terminated
      // All branches have been fetched
      const service_delay = 3;
  
      args.services.forEach((service) => {
        let branch_text = service.branch;
        let branch_color = 'white';

        if (_.isEmpty(branch_text)) {
          // git branch not found
          branch_text = 'git branch not found';
          branch_color = 'yellow';
        }

        debug.log(
          'Run', 'green',
          service.name, 'cyan',
          'on branch (', 'gray',
          branch_text, branch_color,
          ')', 'gray'
        );
      });
  
      debug.separator();
      debug.log(
        'Starting in', 'white',
        service_delay, 'magenta',
        'seconds', 'white'
      );
  
      // Start service process after initial message is shown
      setTimeout(() => {
        // Run first service
        runService(service_index);
      }, service_delay * 1000);
    });
  
    // Q.when(services.kill()).then(() => {
    //   // All running services have been terminated
    //   // Run first service
    //   runService(service_index);
    // });
  }
}

/**
 * Run service job queue in order (recursively)
 * 
 * @param {integer} service_index
 */
function runService(service_index) {
  let service = args.services[service_index];

  if (_.isUndefined(service)) {
    // No more services to run
    // Start the services
    args.services.forEach((service) => {
      service.start();
    });
    return;
  }

  debug.separator();
  debug.log(
    service.name, 'magenta',
    'Starting...', 'gray'
  );

  if (service.is_npm) {
    // Service is a npm package
    Q.fcall(service.handleNodeModules)
      .then(service.handleNpmInstall)
      .then(service.handleNpmLink)
      .then(() => {
        return service.handleParentNpmLink(args.services);
      })
      // .then(service.start)
      .catch((err) => {
        console.error(err);
      })
      .done(() => {
        // Run next service
        runService(service_index + 1);
      });
  }
}