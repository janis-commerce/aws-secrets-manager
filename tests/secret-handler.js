'use strict';

const assert = require('assert');
const sinon = require('sinon');

const SecretHandler = require('../lib/secret-handler');
// const SecretValueCache = require('../lib/secret-value-cache');

const AWS = require('../lib/wrappers/aws');

describe('Secret Handler', () => {

	const secretName = 'my-secret';

	describe('getValue()', () => {

		let secretHandler;

		beforeEach(() => {
			sinon.stub(AWS.secretsManager, 'getSecretValue');
			secretHandler = new SecretHandler(secretName);
		});

		afterEach(() => sinon.restore());

		it('Should reject a AwsSecretsManagerError if AWS fails to fetch the secret', async () => {

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.reject(new Error('Failed to fetch secret'))
			});

			await assert.rejects(() => secretHandler.getValue(), {
				name: 'AwsSecretsManagerError',
				message: 'Failed to fetch secret'
			});
		});

		it('Should reject if the secret has the SecretString property set as an invalid JSON', async () => {

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":INVALID}'
				})
			});

			await assert.rejects(() => secretHandler.getValue(), {
				name: 'AwsSecretsManagerError'
			});
		});

		it('Should resolve a secret string parsed as JSON if the secret has the SecretString property set', async () => {

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":"bar"}'
				})
			});

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});
		});

		it('Should resolve a secret string parsed from base64 if the secret has the SecretBinary property set', async () => {

			const secretBinary = Buffer.from('binary-secret-value', 'utf8').toString('base64');

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.resolve({
					SecretBinary: secretBinary
				})
			});

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, 'binary-secret-value');

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});
		});

		it('Should resolve the whole secret object if fullValueData is passed as truthy', async () => {

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":"bar"}'
				})
			});

			const secretValue = await secretHandler.getValue(true);

			assert.deepStrictEqual(secretValue, {
				SecretString: '{"foo":"bar"}'
			});

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});
		});

		it('Should send the version ID and stage if they are set', async () => {

			AWS.secretsManager.getSecretValue.returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":"bar"}'
				})
			});

			secretHandler.setVersionId('SOMEID');
			secretHandler.setVersionStage('SOMESTAGE');

			const secretValue = await secretHandler.getValue(true);

			assert.deepStrictEqual(secretValue, {
				SecretString: '{"foo":"bar"}'
			});

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			});
		});
	});

	describe('getValue() Cache behaviour', () => {

		let secretHandler;

		beforeEach(() => {
			sinon.stub(AWS.secretsManager, 'getSecretValue')
				.returns({
					promise: () => Promise.resolve({
						SecretString: '{"foo":"bar"}'
					})
				});

			secretHandler = new SecretHandler(secretName);
		});

		afterEach(() => sinon.restore());

		it('Should do just nothing if a non-existent cache is cleared', async () => {
			assert.doesNotThrow(() => secretHandler.clearFromCache());
		});

		it('Should only call AWS Secrets Manager once per secret version and ID', async () => {

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			sinon.assert.calledOnce(AWS.secretsManager.getSecretValue);
		});

		it('Should only call AWS Secrets Manager once even for concurrent calls', async () => {

			const [secretValue, secretValue2] = await Promise.all([
				secretHandler.getValue(),
				secretHandler.getValue()
			]);

			assert.deepStrictEqual(secretValue, { foo: 'bar' });
			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});
		});

		it('Should only call AWS Secrets Manager once per secret version and ID', async () => {

			const secretBinary = Buffer.from('binary-secret-value', 'utf8').toString('base64');

			AWS.secretsManager.getSecretValue
				.withArgs({
					SecretId: secretName
				})
				.returns({
					promise: () => Promise.resolve({
						SecretString: '{"foo":"bar"}'
					})
				});

			AWS.secretsManager.getSecretValue
				.withArgs({
					SecretId: secretName,
					VersionId: 'SOMEID',
					VersionStage: 'SOMESTAGE'
				})
				.returns({
					promise: () => Promise.resolve({
						SecretBinary: secretBinary
					})
				});

			const [secretValue, secretValue2, secretValue3, secretValue4] = await Promise.all([
				secretHandler.getValue(true),
				secretHandler
					.setVersionId('SOMEID')
					.setVersionStage('SOMESTAGE')
					.getValue(),
				secretHandler
					.setVersionId('')
					.setVersionStage('')
					.getValue(true),
				secretHandler
					.setVersionId('SOMEID')
					.setVersionStage('SOMESTAGE')
					.getValue()
			]);

			assert.deepStrictEqual(secretValue, {
				SecretString: '{"foo":"bar"}'
			});
			assert.deepStrictEqual(secretValue2, 'binary-secret-value');
			assert.deepStrictEqual(secretValue3, {
				SecretString: '{"foo":"bar"}'
			});
			assert.deepStrictEqual(secretValue4, 'binary-secret-value');

			sinon.assert.calledTwice(AWS.secretsManager.getSecretValue);
			sinon.assert.calledWithExactly(AWS.secretsManager.getSecretValue.getCall(0), {
				SecretId: secretName
			});
			sinon.assert.calledWithExactly(AWS.secretsManager.getSecretValue.getCall(1), {
				SecretId: secretName,
				VersionId: 'SOMEID',
				VersionStage: 'SOMESTAGE'
			});
		});

		it('Should call AWS Secrets Manager again if cache is cleared', async () => {

			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			sinon.assert.calledOnce(AWS.secretsManager.getSecretValue);

			secretHandler.clearFromCache();
			const secretValue3 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue3, { foo: 'bar' });

			sinon.assert.calledTwice(AWS.secretsManager.getSecretValue);
		});

		it('Should call AWS Secrets Manager again after one day due to cache expiration', async () => {

			AWS.secretsManager.getSecretValue.onCall(0).returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":"bar"}'
				})
			});
			AWS.secretsManager.getSecretValue.onCall(1).returns({
				promise: () => Promise.resolve({
					SecretString: '{"foo":"new-bar"}'
				})
			});

			const clock = sinon.useFakeTimers(Date.now());

			// Get the value and cache for one day
			const secretValue = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue, { foo: 'bar' });

			sinon.assert.calledOnceWithExactly(AWS.secretsManager.getSecretValue, {
				SecretId: secretName
			});

			// Exactly one day - Cache is valid
			await clock.tickAsync(1000 * 60 * 60 * 24);

			const secretValue2 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue2, { foo: 'bar' });

			sinon.assert.calledOnce(AWS.secretsManager.getSecretValue);

			// Past one day - Cache is now invalid
			await clock.tickAsync(1);

			const secretValue3 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue3, { foo: 'new-bar' });

			sinon.assert.calledTwice(AWS.secretsManager.getSecretValue);

			// The cache is valid for another day now
			await clock.tickAsync(1000 * 60 * 60);

			const secretValue4 = await secretHandler.getValue();

			assert.deepStrictEqual(secretValue4, { foo: 'new-bar' });

			sinon.assert.calledTwice(AWS.secretsManager.getSecretValue);
		});

	});

});
