'use strict';

const assert = require('assert');

const { AwsSecretsManagerError } = require('../lib');

describe('AwsSecretsManager', () => {

	it('Should accept an error message', () => {
		const error = new AwsSecretsManagerError('Some error');

		assert.strictEqual(error.message, 'Some error');
		assert.strictEqual(error.name, 'AwsSecretsManagerError');
	});

	it('Should accept an error instance and a code', () => {

		const previousError = new Error('Some error');

		const error = new AwsSecretsManagerError(previousError);

		assert.strictEqual(error.message, 'Some error');
		assert.strictEqual(error.name, 'AwsSecretsManagerError');
		assert.strictEqual(error.previousError, previousError);
	});
});
