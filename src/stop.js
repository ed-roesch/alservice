const Q = require('q');
const _ = require('lodash');
const debug = require('./debug');
const Services = require('./service/services');
const Args = require('./arguments');
const config = require('./config');

const args = new Args(process.argv);

// Current service job
let service_index = 0;

if (args.svc_args.length) {
  // Specific services to stop
  stopService(service_index);

} else {
  // Stop all services
  const services = new Services();

  debug.log(
    'Services', 'magenta',
    'Stopping...', 'yellow'
  );

  Q.fcall(() => {
    return services.kill();
  })
  .catch((err) => {
    console.error(err);
  })
  .done(() => {
    // All running services have been terminated
    debug.log(
      'Services', 'magenta',
      'Stopped', 'green'
    );
  });
}

/**
 * Stop service job queue in order (recursively)
 * 
 * @param {integer} service_index
 */
function stopService(service_index) {
  let service = args.services[service_index];

  if (_.isUndefined(service)) {
    // No more services to run
    return;
  }

  debug.separator();
  debug.log(
    service.name, 'magenta',
    'Stopping...', 'yellow'
  );

  Q.when(service.killScreenSession()).then(() => {
    // Service stopped
    debug.log(
      service.name, 'magenta',
      'Stopped', 'green'
    );

    // Run next service
    runService(service_index + 1);
  });
}