/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-disable no-underscore-dangle */
const Ajv = require('ajv');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');

let _ajv;

async function ajv(logger) {
  if (!_ajv) {
    logger.debug('initializing ajv');
    const schemadir = path.resolve(__dirname, '..', 'schemas');
    const validator = new Ajv({ allErrors: true, verbose: true });
    const sourcefiles = await fs.readdir(schemadir);

    const schemas = sourcefiles
      .filter(file => file.match(/\.schema\.json$/))
      .map(schema => path.resolve(schemadir, schema));

    await Promise.all(schemas.map(async (file) => {
      const schemaData = await fs.readJSON(file);
      validator.addSchema(schemaData);
      logger.debug(`- ${schemaData.$id}  (${path.basename(file)})`);
    }));
    logger.debug('ajv initialized');
    _ajv = validator;
  }
  return _ajv;
}

async function validate(context, action, index) {
  const validator = await ajv(action.logger);
  const cvalid = validator.validate('https://ns.adobe.com/helix/pipeline/context', context);
  if (!cvalid) {
    action.logger.warn(`Invalid Context at step ${index}, ${validator.errorsText()}`);
    throw new Error(`Invalid Context at step ${index}\n${validator.errorsText()}`);
  }
  const avalid = validator.validate('https://ns.adobe.com/helix/pipeline/action', action);
  if (!avalid) {
    action.logger.warn(`Invalid Action at step ${index}, ${validator.errorsText()}`);
    throw new Error(`Invalid Action at step ${index}\n${validator.errorsText()}`);
  }
}

module.exports = validate;
