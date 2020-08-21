'use strict';

const AwsSecretsManagerError = require('./aws-secrets-manager-error');
const AWS = require('./wrappers/aws');
const SecretValueCache = require('./secret-value-cache');

module.exports = class SecretHandler {

	constructor(secretName) {
		this.secretName = secretName;
		this.versionId = '';
		this.versionStage = '';
		this.cache = new SecretValueCache();
	}

	setVersionId(versionId) {
		this.versionId = versionId || '';
		return this;
	}

	setVersionStage(versionStage) {
		this.versionStage = versionStage || '';
		return this;
	}

	parseValueSecret(value) {

		if(value.SecretString)
			return JSON.parse(value.SecretString);

		return Buffer.from(value.SecretBinary, 'base64').toString('utf8');
	}

	/**
	 * Sets a secret value promise in cache.
	 *
	 * @param {Promise} secret A promise that may resolve to a secret data object
	 */
	setInCache(secret) {
		this.cache.set(this.versionId, this.versionStage, secret);
	}

	/**
	 * Gets the value promise from cache.
	 *
	 * @return {Promise} A promise that resolves to the value data, or null if it's not present in cache
	 */
	getFromCache() {
		return this.cache.get(this.versionId, this.versionStage);
	}

	/**
	 * Removes a value from the cache.
	 */
	clearFromCache() {
		this.cache.clear(this.versionId, this.versionStage);
	}

	/**
	 * Gets the value of the secret. It stores and checks for promises in the cache to handle concurrency properly.
	 *
	 * @param {boolean} [fullValueData=false] Whether to return full value data or just the secret value
	 * @return {Promise} Resolves to the secret value data or just the value depending on @param fullValueData.
	 */
	async getValue(fullValueData = false) {

		try {

			// Freeze values to prevent them from being changed by a concurrent call
			const {
				versionId,
				versionStage
			} = this;

			const cachedValuePromise = this.getFromCache();

			if(cachedValuePromise) {
				const cachedValue = await cachedValuePromise;
				return fullValueData ? cachedValue : this.parseValueSecret(cachedValue);
			}

			const params = {
				SecretId: this.secretName
			};

			if(versionId)
				params.VersionId = versionId;

			if(versionStage)
				params.VersionStage = versionStage;

			const valuePromise = AWS.secretsManager.getSecretValue(params).promise();

			this.setInCache(valuePromise);

			const value = await valuePromise;

			return fullValueData ? value : this.parseValueSecret(value);

		} catch(e) {
			throw new AwsSecretsManagerError(e);
		}

	}

};
