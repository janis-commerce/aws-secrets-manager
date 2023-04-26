'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { mockClient } = require('aws-sdk-client-mock');
const { GetSecretValueCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const SecretHandler = require('../lib/secret-handler');

const AWS = require('../lib/wrappers/aws');

describe('Secret Handler', () => {

	const secretName = 'my-secret';

	const secret = {
		apiSecret: 'aekAoAyLxRjwxHCXSIWaS',
		databases: {},
		dbConnectionStrings: {},
		keyPairId: 'L4STHIRTHUJCFY',
		privateKey: 'FIEtFWS0tLS0tCg=='
	};

	const secretString = JSON.stringify(secret);

	const responseUpdate = {
		VersionId: '26tf-90ab-cdef-fedc-ba987'
	};

	const paramsUpdateWithSecretString = {
		SecretId: secretName,
		SecretString: secretString
	};

	const paramsUpdateWithSecretBinary = {
		SecretId: secretName,
		SecretBinary: Buffer.from(secretString, 'utf-8').toString('base64')
	};

	describe('getValue()', () => {

		let secretHandler;

		beforeEach(() => {
			this.secretsManagerClientMock = mockClient(AWS.secretsManager.SecretsManagerClient);
			secretHandler = new SecretHandler(secretName);
		});

		afterEach(() => this.secretsManagerClientMock.reset());

		it('Should reject a AwsSecretsManagerError if AWS fails to fetch the secret', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves(new Error('Failed to fetch secret'));

			await assert.rejects(() => secretHandler.getValue(), {
				name: 'AwsSecretsManagerError'
			});
		});

		it('Should reject if the secret has the SecretString property set as an invalid JSON', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"foo":INVALID}' });

			await assert.rejects(() => secretHandler.getValue(), {
				name: 'AwsSecretsManagerError'
			});
		});

		it('Should resolve a secret string parsed as JSON if the secret has the SecretString property set', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"foo":"bar"}' });

			const params = { foo: 'bar' };

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, params);

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, params);
		});

		it('Should resolve a secret string parsed from base64 if the secret has the SecretBinary property set', async () => {

			const secretBinary = Buffer.from('binary-secret-value', 'utf8').toString('base64');

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretBinary: secretBinary });

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, 'binary-secret-value');

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
		});

		it('Should resolve the whole secret object if fullValueData is passed as truthy', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"foo":"bar"}' });

			const secretValue = await secretHandler.getValue(true);

			assert.deepStrictEqual(secretValue, { SecretString: '{"foo":"bar"}' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
		});

		it('Should send the version ID and stage if they are set', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"foo":"bar"}' });

			secretHandler.setVersionId('SOMEID');
			secretHandler.setVersionStage('SOMESTAGE');

			const secretValue = await secretHandler.getValue(true);

			assert.deepStrictEqual(secretValue, { SecretString: '{"foo":"bar"}' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, {
				SecretId: secretName,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			});
		});
	});

	describe('updateValue()', () => {

		let secretHandler;

		beforeEach(() => {
			this.secretsManagerClientMock = mockClient(AWS.secretsManager.SecretsManagerClient);
			secretHandler = new SecretHandler(secretName);
		});

		afterEach(() => this.secretsManagerClientMock.reset());

		it('Should reject a AwsSecretsManagerError if AWS fails to fetch the current secret', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).rejects('Failed to fetch current secret');

			await assert.rejects(() => secretHandler.updateValue(secret), {
				name: 'AwsSecretsManagerError'
			});

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 1);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand).length, 0);
		});

		it('Should reject a AwsSecretsManagerError if AWS fails to update the secret', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"privateKey":"dsOS2j4"}' });
			this.secretsManagerClientMock.on(UpdateSecretCommand).rejects('Failed to update secret');

			await assert.rejects(() => secretHandler.updateValue(secret), {
				name: 'AwsSecretsManagerError'
			});

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 1);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand, paramsUpdateWithSecretString).length, 1);
		});

		it('Should reject if it fails to parse the secret', async () => {

			await assert.rejects(() => secretHandler.updateValue(), {
				name: 'AwsSecretsManagerError'
			});

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 0);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand).length, 0);
		});

		it('Should update value secret encoding it as a secret string ', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"privateKey":"dsOS2j4"}' });
			this.secretsManagerClientMock.on(UpdateSecretCommand).resolves(responseUpdate);

			const secretValue = await secretHandler.updateValue(secret);

			assert.deepStrictEqual(secretValue, responseUpdate);

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 1);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand, paramsUpdateWithSecretString).length, 1);
		});

		it('Should update value secret encoding it as a secret binary ', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretBinary: 'eyJmb28iOiJiYXIifQ==' });
			this.secretsManagerClientMock.on(UpdateSecretCommand).resolves(responseUpdate);

			const secretValue = await secretHandler.updateValue(secret);

			assert.deepStrictEqual(secretValue, responseUpdate);

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 1);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand, paramsUpdateWithSecretBinary).length, 1);
		});

		it('Should update value secret by specifying the version ID and stage if they are set ', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"privateKey":"dsOS2j4"}' });
			this.secretsManagerClientMock.on(UpdateSecretCommand).resolves(responseUpdate);

			secretHandler.setVersionId('SOMEID');
			secretHandler.setVersionStage('SOMESTAGE');

			const secretValue = await secretHandler.updateValue(secret);

			assert.deepStrictEqual(secretValue, responseUpdate);

			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(GetSecretValueCommand).length, 1);
			assert.deepStrictEqual(this.secretsManagerClientMock.commandCalls(UpdateSecretCommand, {
				...paramsUpdateWithSecretString,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			}).length, 1);
		});

	});

	describe('setVersionId()', () => {

		let secretHandler;

		beforeEach(() => {
			secretHandler = new SecretHandler(secretName);
		});

		it('Should be chainable', async () => {
			const returnValue = secretHandler.setVersionId('SOMEID');

			assert.strictEqual(returnValue, secretHandler);
		});
	});

	describe('setVersionStage()', () => {

		let secretHandler;

		beforeEach(() => {
			secretHandler = new SecretHandler(secretName);
		});

		it('Should be chainable', async () => {
			const returnValue = secretHandler.setVersionStage('SOMESTAGE');

			assert.strictEqual(returnValue, secretHandler);
		});
	});

	describe('clearFromCache()', () => {

		let secretHandler;

		beforeEach(() => {
			secretHandler = new SecretHandler(secretName);
		});

		it('Should be chainable', async () => {
			const returnValue = secretHandler.clearFromCache();

			assert.strictEqual(returnValue, secretHandler);
		});

		it('Should do just nothing if a non-existent cache is cleared', async () => {
			assert.doesNotThrow(() => secretHandler.clearFromCache());
		});
	});

	describe('getValue() Cache behavior', () => {

		let secretHandler;

		beforeEach(() => {
			this.secretsManagerClientMock = mockClient(AWS.secretsManager.SecretsManagerClient);
			this.secretsManagerClientMock.on(GetSecretValueCommand).resolves({ SecretString: '{"foo":"bar"}' });

			secretHandler = new SecretHandler(secretName);
		});

		afterEach(() => sinon.restore());

		it('Should only call AWS Secrets Manager once per secret', async () => {

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
		});

		it('Should only call AWS Secrets Manager once even for concurrent calls', async () => {

			const secretValue = await secretHandler.getValue();
			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });
			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
		});

		it('Should only call AWS Secrets Manager once per secret version and ID', async () => {

			const secretBinary = Buffer.from('binary-secret-value', 'utf8').toString('base64');

			this.secretsManagerClientMock.on(GetSecretValueCommand, { SecretId: secretName })
				.resolves({ SecretString: '{"foo":"bar"}' });

			this.secretsManagerClientMock.on(GetSecretValueCommand, {
				SecretId: secretName,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			}).resolvesOnce({ SecretBinary: secretBinary });

			const secretValue = await secretHandler.getValue(true);
			const secretValue2 = await secretHandler
				.setVersionId('SOMEID')
				.setVersionStage('SOMESTAGE')
				.getValue();
			const secretValue3 = await secretHandler
				.setVersionId('')
				.setVersionStage('')
				.getValue(true);
			const secretValue4 = await secretHandler
				.setVersionId('SOMEID')
				.setVersionStage('SOMESTAGE')
				.getValue();

			assert.deepStrictEqual(secretValue, { SecretString: '{"foo":"bar"}' });
			assert.deepStrictEqual(secretValue2, 'binary-secret-value');
			assert.deepStrictEqual(secretValue3, { SecretString: '{"foo":"bar"}' });
			assert.deepStrictEqual(secretValue4, 'binary-secret-value');

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, {
				SecretId: secretName,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			});
		});

		it('Should call AWS Secrets Manager again if cache is cleared', async () => {

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			secretHandler.clearFromCache();
			const secretValue3 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue3, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

		});

		it('Should call AWS Secrets Manager again after one day due to cache expiration', async () => {

			this.secretsManagerClientMock.on(GetSecretValueCommand)
				.resolvesOnce({ SecretString: '{"foo":"bar"}' })
				.resolvesOnce({ SecretString: '{"foo":"new-bar"}' });

			const clock = sinon.useFakeTimers(Date.now());

			// Get the value and cache for one day
			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			// Exactly one day - Cache is valid
			await clock.tickAsync(1000 * 60 * 60 * 24);

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			// Past one day - Cache is now invalid
			await clock.tickAsync(1);

			const secretValue3 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue3, { foo: 'new-bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });

			// The cache is valid for another day now
			await clock.tickAsync(1000 * 60 * 60);

			const secretValue4 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue4, { foo: 'new-bar' });

			this.secretsManagerClientMock.commandCalls(GetSecretValueCommand, { SecretId: secretName });
		});

	});

});
