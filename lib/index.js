'use strict';

const AwsSecretsManager = require('./aws-secrets-manager');
const AwsSecretsManagerError = require('./aws-secrets-manager-error');

module.exports = {
	AwsSecretsManager,
	AwsSecretsManagerError
};
