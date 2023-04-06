'use strict';

const { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManagerClient = new SecretsManagerClient({});

module.exports.secretsManager = {
	SecretsManagerClient: secretsManagerClient,
	getSecretValue: params => secretsManagerClient.send(new GetSecretValueCommand(params)),
	updateSecret: params => secretsManagerClient.send(new UpdateSecretCommand(params))
};
