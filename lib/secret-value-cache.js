'use strict';

module.exports = class SecretValueCache {

	constructor() {
		this.cache = {};
	}

	set(versionId, versionStage, secret) {

		// Expires in one day
		const expirationDate = new Date();
		expirationDate.setHours(expirationDate.getHours() + 24);

		if(!this.cache[versionId])
			this.cache[versionId] = {};

		this.cache[versionId][versionStage] = {
			expirationDate,
			secret
		};
	}

	get(versionId, versionStage) {

		if(this.cache[versionId] && this.cache[versionId][versionStage]) {

			const {
				expirationDate,
				secret
			} = this.cache[versionId][versionStage];

			if(expirationDate.getTime() >= Date.now())
				return secret;
		}

		return null;
	}

	clear(versionId, versionStage) {
		if(this.cache[versionId] && this.cache[versionId][versionStage])
			this.cache[versionId][versionStage] = null;
	}

};
