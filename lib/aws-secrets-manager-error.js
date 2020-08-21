'use strict';

class AwsSecretsManagerError extends Error {

	constructor(err) {

		super(err.message || err);
		this.name = 'AwsSecretsManagerError';

		if(err instanceof Error)
			this.previousError = err;
	}
}

module.exports = AwsSecretsManagerError;
