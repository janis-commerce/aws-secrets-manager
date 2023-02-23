'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManagerClient({});

module.exports.secretsManager = {
	getSecretValue: async params => secretsManager.send(new GetSecretValueCommand(params))
};
