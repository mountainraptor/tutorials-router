/**
Copyright 2017 LGS Innovations

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/
(() => {
  'use strict';
  const ROUTER_PATH = '/api/tutorials-router/cats';

  const os = require('os');
  const path = require('path');
  const BaseServer = global.helper.BaseServer;
  const UtilFs = global.utils.UtilFs;
  const multer = BaseServer.multer;
  const express = BaseServer.express;
  const Router = express.Router;

  class CatRouter {
    constructor() {
      const storage = multer.diskStorage({
        destination: function(req, file, cb) {
          cb(null, os.tmpDir());
        },
        filename: function(req, file, cb) {
          cb(null, file.originalname);
        }
      });

      const upload = multer({storage: storage});

      this._router = new Router();
      this._router.get('/', (req, res) => res.status(200).json({cats: []}));
      this._router.post('/', upload.single('image'), (req, res) => {
        UtilFs.exists(path.resolve('req.file.destination, req.file.originalname'))
        .then(() => res.status(200).json({success: true, error: null}))
        .catch((err) => res.status(400).json({success: false, error: err.message}));
      });
      this._baseServer = null;
    }

    load(baseServer) {
      return Promise.resolve()
      .then(() => {
        this._baseServer = baseServer;
      })
      .then(() => this._baseServer.use(ROUTER_PATH, this._router));
    }

    unload() {
      return Promise.resolve()
      .then(() => this._baseServer.removeMiddleware(ROUTER_PATH, this._router))
      .then(() => {
        this._baseServer = null;
      });
    }
  }

  module.exports = CatRouter;
})()
