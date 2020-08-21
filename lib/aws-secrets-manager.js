'use strict';

const SecretHandler = require('./secret-handler');

const handlers = {};

module.exports = class AwsSecretsManager {

	static secret(secretName) {
		if(!handlers[secretName])
			handlers[secretName] = new SecretHandler(secretName);

		return handlers[secretName];
	}

};
