'use strict';

const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({ apiVersion: '2017-10-17' });

module.exports.secretsManager = secretsManager;
