'use strict';

const SecretsManager = require('aws-sdk/clients/secretsmanager');

const secretsManager = new SecretsManager({ apiVersion: '2017-10-17' });

module.exports.secretsManager = secretsManager;
