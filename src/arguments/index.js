const _ = require('lodash');
const debug = require('../debug');
const Services = require('../service/services');
const config = require('../config');

class Args {
  /**
   * Initialize arguments
   * 
   * @param {array} args
   */
  constructor(args) {
    const services = new Services();

    // Remove first two arguments as they are paths
    args.splice(0, 2);

    // Raw arguments
    this.raw = args;

    // Services to run
    this.services = [];

    // Split args into groups, one for services and one for variables
    this.svc_args = [];
    this.var_args = [];

    args.forEach((arg) => {
      // Split argument into appropriate group
      if (arg.indexOf('=') >= 0) {
        // Variable argument
        this.var_args.push(arg);
      } else {
        // Service argument
        this.svc_args.push(arg);
      }
    });

    this.svc_args.forEach((arg) => {
      // Handle service arguments
      let service = _.find(services.svc, { name: arg });
      
      if (_.isUndefined(service)) {
        // Service doe not exist
        debug.log(
          'Service', 'red',
          arg, 'cyan',
          'does not exist', 'red'
        );

        return;
      }

      // Add service to service to run
      service.run = true;
      this.services.push(service);

    });

    this.var_args.forEach((arg) => {
      // Handle variable arguments
      // Split argument into key/value
      const splt = arg.split('=');
      const key = splt[0];
      let value = splt[1].toLowerCase();

      if (
        value === 'true' || 
        value === 'yes' ||
        value === 'y' ||
        value === '1'
      ) {
        // Set value as a boolean
        value = true;
      }

      if (
        value === 'false' || 
        value === 'no' ||
        value === 'n' ||
        value === '0'
      ) {
        // Set value as a boolean
        value = false;
      }
      
      // Set new config value
      config[key] = value;
    });

    if (this.services.length > 0) {
      let member_app_service = _.find(this.services, { name: 'member-app' });
      let office_app_service = _.find(this.services, { name: 'office-app' });

      if (member_app_service && office_app_service) {
        // Cannot run both member-app and office-app
        debug.log(
          'Cannot run both', 'red',
          'member-app', 'cyan',
          'and', 'red',
          'office-app', 'cyan'
        );

        // Reset services to halt running
        this.services = [];

      } else if (member_app_service || office_app_service) {
        // Running member-app or office-app
        let service = member_app_service || office_app_service;

        // Move as the last service to run
        this.services.push(this.services.splice(this.services.indexOf(service), 1)[0]);
      }
    }

    // If clean build, force npm services to re-install
    if (config.clean === true) {
      if (config.log === 'debug' || config.log === 'verbose') {
        debug.log(
          'Clean', 'green',
          'all npm services', 'white'
        );
      }

      this.services.forEach(service => {
        if (service.is_npm) {
          // force clear node_modules folder
          service.do_clear_node_modules = true;
          // force npm install
          service.do_npm_install = true;

          if (service.is_ion) {
            // force npm link
            service.do_npm_link = true;
          }
        }
      });
    }
  }
}

module.exports = Args;
