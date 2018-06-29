# Angie's List Services
Command line tool to run and manage all services

## Requirements
* node v8.10.0+

## About
This tool was made to help developers install and run any combination of services (i.e. apps, ions, gateways).
It will automatically install dependencies and link together where needed. And all output is contained to a single 
command line instance. No more CLI switching and manually deleting, installing, and linking `node_modules` apps and ions.

## Installation
### From the project root folder, run
```
npm install
```

## Start Service(s)
Run any combination of services and they will automatically configure and link together. For example, running member-app and message-center-ion.
```
npm start member-app message-center-ion env=stage4
```
For a clean build, set the `clean` variable to true.
```
npm start member-app message-center-ion env=stage4 clean=true
```
If a service crashes unexpectedly, the script will attempt to automatically restart it for you.

## Config
Global config options are in the **config.json** file (generated on first run).

| Option | Type | Default | Notes |
| ------ | ---- | ------- | ----- |
| env | *string* | stage4 | environment |
| log | *string* | info | accepts: **info**, **debug**, **verbose** |
| clean | *boolean* | false | re-install all services before running |
| path | *object* | | path to each repository |

## Supported Services
### apps
* office-app
* member-app

### ions
* account-ion
* content-ion
* job-management-ion
* lead-ion
* lead-management-ion
* message-center-ion
* offer-ion
* project-ion
* review-ion
* search-ion
* service-provider-add-ion
* service-provider-profile-ion

### gateways
* Coming soon