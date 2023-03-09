'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManagerClient = new SecretsManagerClient({});

module.exports.secretsManager = {
	SecretsManagerClient: secretsManagerClient,
	getSecretValue: params => secretsManagerClient.send(new GetSecretValueCommand(params))
};
