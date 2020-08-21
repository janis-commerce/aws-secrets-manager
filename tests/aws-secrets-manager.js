'use strict';

const assert = require('assert');

const { AwsSecretsManager } = require('../lib');

describe('AwsSecretsManager', () => {

	describe('secret()', () => {

		it('Should generate always the same handler for the same secret', () => {

			const firstHandler = AwsSecretsManager.secret('secret-one');
			const secondHandler = AwsSecretsManager.secret('secret-one');

			assert.strictEqual(firstHandler, secondHandler);
		});

		it('Should generate different handlers for different secrets', () => {

			const firstHandler = AwsSecretsManager.secret('secret-one');
			const secondHandler = AwsSecretsManager.secret('secret-two');

			assert.notEqual(firstHandler, secondHandler);
		});
	});

});
