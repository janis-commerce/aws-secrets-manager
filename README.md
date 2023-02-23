# aws-secrets-manager

![Build Status](https://github.com/janis-commerce/aws-secrets-manager/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/aws-secrets-manager/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/aws-secrets-manager?branch=master)
[![npm version](https://badge.fury.io/js/%40janiscommerce%2Faws-secrets-manager.svg)](https://www.npmjs.com/package/@janiscommerce/aws-secrets-manager)

A wrapper of [AWS Secrets Manager](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html) with cache for node.

## Installation

```sh
npm install @janiscommerce/aws-secrets-manager
```

## API

### AwsSecretsManager

The package main entry point.

#### `static secret(secretName: string): secretHandler`

Builds and returns an instance of secretHandler. It always returns the same instance for a secret name

### SecretHandler

The handler to fetch and cache the secrets values.

#### `async getValue(): string | object`

For string-based values, it resolves a JSON-parsed object. For binary-based values, it resolves a utf8 encoded string.

It rejects an `AwsSecretsManagerError` in case an error occurs (network error, non-existent secret, invalid JSON string, etc).

**Cache:** The values are cached for 1 day. After that, it will be fetched again from AWS. This reduces API calls and therefore costs significantly. You can clear the cache manually anytime by calling `clearFromCache()`

#### `setVersionId(): this`

Sets the version ID to be handled.

#### `setVersionStage(): this`

Sets the version stage to be handled.

#### `clearFromCache(): this`

Clears the cache for the current version ID/stage. Next time `getValue()` is called, it will fetch the value from AWS.

### AwsSecretsManagerError

The custom error class that will be rejected in case of error. You may find more information in the `previousError` property.

## Usage

```js
const AwsSecretsManager = require('@janiscommerce/aws-secrets-manager');

const secretHandler = AwsSecretsManager.secret('my-secret-name-or-arn');

// Get the value with VersionStage of AWSCURRENT
const value = await secretHandler.getValue();

// Get an specific VersionStage
const previousValue  = await secretHandler.setVersionStage('AWSPREVIOUS');

// Get an specific version value
const specificValue = await secretHandler
	.setVersionId('other-version')
	.setVersionStage() // Remove version stage parameter
	.getValue();

// Clear cache manually (this only clears current set version ID and Stage)
secretHandler.clearFromCache();
```
