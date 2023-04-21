# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2023-04-21
### Fixed
- Moved `aws-sdk-client-mock` to dev dependencies to reduce package bundle size

## [1.0.2] - 2023-03-09
### Fixed
- Update dependencies and improve tests

## [1.0.1] - 2023-03-09
### Fixed
- Fix getting a secret value

## [1.0.0] - 2023-02-23
### Changed
- Now the package use the AWS SDK `V3`

## [0.2.1] - 2022-01-29
### Changed
- AWS SDK require now requires only SecretsManager client

## [0.2.0] - 2020-08-24
### Added
- Methods chainability
- Documentation

## [0.1.0] - 2020-08-21
### Added
- First version of the package with values fetching with time-based cache and on-demand cache cleanning
