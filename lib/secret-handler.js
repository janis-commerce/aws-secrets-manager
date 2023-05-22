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

	/**
	 * Sets the version ID.
	 *
	 * @param {string} versionId The version ID
	 * @return {Object} The 'this' object
	 */
	setVersionId(versionId) {
		this.versionId = versionId || '';
		return this;
	}

	/**
	 * Sets the version stage.
	 *
	 * @param {string} versionStage The version stage
	 * @return {Object} The 'this' object
	 */
	setVersionStage(versionStage) {
		this.versionStage = versionStage || '';
		return this;
	}

	/**
	 * Removes a value from the cache.
	 *
	 * @return {Object} The 'this' object
	 */
	clearFromCache() {
		this.cache.clear(this.versionId, this.versionStage);
		return this;
	}

	/**
	 * Gets the value of the secret. It stores and checks for promises in the cache to handle concurrency properly.
	 *
	 * @param {boolean} [fullValueData=false] Whether to return full value data or just the secret value
	 * @return {Promise} Resolves to the secret value data or just the value depending on
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

			const valuePromise = AWS.secretsManager.getSecretValue(params);

			this.setInCache(valuePromise);

			const value = await valuePromise;

			return fullValueData ? value : this.parseValueSecret(value);

		} catch(e) {
			throw new AwsSecretsManagerError(e);
		}

	}

	/**
	 * Parses the secret value, whether its a string or a binary
	 *
	 * @param {object} value The value data object
	 * @return {string|object} A JSON-parsed object if secret value was a string; a UTF8 encoded string if secret was a base64 encoded string.
	 */
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
	 * Update the value of the secret.
	 *
	 * @param {object} newSecret An object with the secret information.
	 * @return {object} The response of the request to AWS
	 */
	async updateValue(newSecret) {

		try {

			if(!(typeof newSecret === 'object' && !Array.isArray(newSecret)))
				throw new Error('Secret is not an object');

			if(!Object.keys(newSecret).length)
				throw new Error('Secret has no content');

			const {
				versionId,
				versionStage
			} = this;

			const serializeSecret = JSON.stringify(newSecret);

			const currentSecret = await this.getValue(true);

			const params = {
				SecretId: this.secretName,
				...currentSecret.SecretString ? {
					SecretString: serializeSecret
				} : {
					SecretBinary: Buffer.from(serializeSecret, 'utf-8').toString('base64')
				},
				...versionId && { VersionId: versionId },
				...versionStage && { VersionStage: versionStage }
			};

			const newValuePromise = AWS.secretsManager.updateSecret(params);

			this.setInCache(newValuePromise);

			const newValue = await newValuePromise;

			return newValue;

		} catch(error) {
			throw new AwsSecretsManagerError(error);
		}

	}

	/**
	 * Gets the value promise from cache.
	 *
	 * @return {Promise} A promise that resolves to the value data, or null if it's not present in cache
	 */
	getFromCache() {
		return this.cache.get(this.versionId, this.versionStage);
	}
};
