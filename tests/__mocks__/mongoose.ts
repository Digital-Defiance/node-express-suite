/**
 * Mock mongoose to work around Jest getter issues.
 *
 * Mongoose uses getters for many of its exports (Schema, Model, Types, etc.),
 * which don't work properly with Jest/ts-jest's module transformation.
 * This mock bypasses Jest's module system by directly requiring mongoose,
 * which ensures the getters are properly evaluated.
 */
const path = require('path');
const mongoosePath = path.dirname(require.resolve('mongoose/package.json'));
const mongoose = require(mongoosePath);

// Export the actual mongoose with all getters properly evaluated
module.exports = mongoose;
module.exports.default = mongoose;
