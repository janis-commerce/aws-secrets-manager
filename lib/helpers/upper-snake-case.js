'use strict';


const snakeCase = require('lodash.snakecase');
/**
 * @param {string} string
 * @returns {string} The string in UPPER_SNAKE_CASE
 */
module.exports.upperSnakeCase = string => snakeCase(string).toUpperCase();
