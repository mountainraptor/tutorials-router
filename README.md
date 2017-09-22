BITS "Router" Tutorial
---
This tutorial shows how to use the BaseServer and Router subsystems in the BITS stack.

- [Objectives](#objectives)
- [Before You Begin](#before-you-begin)
- [Step 1: Add Base Server](#step-1)
- [Step 2: Create a Router](#step-2)
- [Step 3: Upload a File](#step-3)

# <a name="objectives"></a> Objectives
- General understanding of the BaseServer subsystem.
- Handle HTTP request
- Upload file from the UI

# <a name="before-you-begin"></a> Before You Begin
The BITS Base process starts a web server that serves static assets and handles HTTP requests.Additionally, there is a service in the BITS Base that allows modules to register to handle web requests on specific routes.

You need to setup a BITS Base, and be able to communicate with a running instance. If you do not already have a BITS Base running, you can create one by downloading the source and using the development command-line. You should also have a good understanding of modules and message center.

# <a name="step-1"></a> Step 1: Add Base Server
A module can register a router with the Base by using the BaseServer class. The BaseServer class is accessible from the `global.helper` object.
``` javascript
const BaseServer = global.helper.BaseServer;
```
Create an instance of BaseServer.
``` javascript
this._baseServer = new BaseServer({logging: true});
```
Then load/unload the instance of the BaseServer when the module loads/unloads.
``` javascript
.then(() => this._baseServer.load(messageCenter))

.then(() => this._baseServer.unload());
```
The module is now able to use the BaseServer instance to register routes.

# <a name="step-2"></a> Step 2: Create a Router
The BaseServer class exposes the express node module for the BITS modules to use. Create a class that encapsulates the router.
``` javascript
const ROUTER_PATH = '/api/tutorials-router/cats';

const BaseServer = global.helper.BaseServer;
const express = BaseServer.express;
const Router = express.Router;

class CatRouter {
  constructor() {
    this._router = new Router();
    this._router.get('/', (req, res) => res.status(200).json({cats: []}));
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
```
Create and load a CatRouter in the CatManager.
``` javascript
const CatRouter = require('./cat-router');

class CatManager {
  constructor() {
    this._router = new CatRouter();
  }

  load(messageCenter, baseServer) {
    return Promise.resolve()
    .then(() => this._router.load(baseServer));
  }

  unload() {
    return Promise.resolve()
    .then(() => this._router.unload());
  }
}
```
Make sure to pass the BaseServer instance to the CatManager load.
``` javascript
.then(() => this._catManager.load(messageCenter, this._baseServer));
```
To verify the router is working add an `<iron-ajax>` request to the modules page element. By default all routes require authentication, so a `<base-auth>` element is used to get the accessToken to send with the request.
``` html
<link rel="import" href="../../bower_components/polymer/polymer.html">
<link rel="import" href="../../bower_components/iron-ajax/iron-ajax.html">
<link rel="import" href="../base-auth/base-auth.html">

<dom-module id="tutorials-router-app">
  <template>
    <style>
      :host {
        display: block;
      }
    </style>

    <base-auth access-token="{{accessToken}}"></base-auth>

    <iron-ajax
      auto
      url="/api/tutorials-router/cats?access_token=[[accessToken]]"
      handle-as="json"
      on-response="handleResponse"></iron-ajax>

  </template>
  <script>
  (() => {
    'use strict';

    Polymer({
      is: 'tutorials-router-app',

      handleResponse: function(event, detail) {
        const cats = detail.response.cats;
        console.log(`Got ${cats.length} cat(s).`);
      }
    });
  })();
  </script>
</dom-module>
```

# <a name="step-3"></a>Step 3: Upload a File
A router can be configured to handle file uploads. The BaseServer exposes the multer node module to handle multipart form data requests. Add `POST` request handler to the cats router that accepts an image file.
``` javascript
const os = require('os');
const UtilFs = global.utils.UtilFs;
const multer = BaseServer.multer;

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, os.tmpdir());
  }
});

const upload = multer({storage: storage});

this._router.post('/', upload.single('image'), (req, res) => {
  UtilFs.unlink(req.file.path)
  .then(() => res.status(200).json({success: true, error: null}))
  .catch((err) => res.status(400).json({success: false, error: err.message}));
});
```
This simple `POST` just accepts and removes the uploaded file. Add the `<vaadin-upload>` custom element to the module page element to upload images.
``` html
<link rel="import" href="../../bower_components/vaadin-upload/vaadin-upload.html">

<vaadin-upload
  accept="image/*"
  form-data-name="image"
  target="/api/tutorials-router/cats"
  headers='{"Authorization": "Bearer [[accessToken]]"}'
  method="POST">
</vaadin-upload>
```

# <a name="step-4"></a>Step 4: Upload a File and keep it's name
Now that you can upload a file, you might want to keep it instead of simply unlinking it. In this step we'll show you how to adapt the router to keep the filename and store the file in your OS tmp directory (/tmp in Linux).
``` javascript
const os = require('os');
const path = require('path');
const BaseServer = global.helper.BaseServer;
const UtilFs = global.utils.UtilFs;
const multer = BaseServer.multer;
const express = BaseServer.express;
const Router = express.Router;

class CatRouter {
  constructor() {
    console.log(os.tmpdir());
    const storage = multer.diskStorage({
      destination: function(req, file, cb) {
        cb(null, os.tmpdir());
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
```

# <a name="step-5"></a>Step 5: Make your own BITS data directory
Maybe you want to keep this data around and do something with it. If that's the case, create your own data directory by adapting the code below as follows. This clobbers data (if the filename is the same it will get overwritten). You can avoid that with more logic or by adding something to the filename String (Date.now() perhaps).
``` javascript
const os = require('os');
const path = require('path');
const BaseServer = global.helper.BaseServer;
const UtilFs = global.utils.UtilFs;
const multer = BaseServer.multer;
const express = BaseServer.express;
const Router = express.Router;

class CatRouter {
  constructor() {
    this._catDir = path.resolve(global.paths.data, 'cats/');
    this._catPicturesDir = path.resolve(global.paths.data, 'cats/pictures/');

    const storage = multer.diskStorage({
      destination: function(req, file, cb) {
        cb(null, path.resolve(global.paths.data, 'cats/pictures/'));
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
      UtilFs.ensureDirectoryExists(this._catDir);
    })
    .then(() => this._baseServer.use(ROUTER_PATH, this._router));
  }
```
