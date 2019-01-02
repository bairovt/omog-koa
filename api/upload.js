'use strict';
const db = require('../lib/arangodb');
const config = require('config');
const promisify = require('util').promisify;
const fs = require('fs');
const path = require('path');
const aql = require('arangojs').aql;
const Router = require('koa-router');
const multer = require('koa-multer');
const gm = require('gm');
const loGet = require('lodash').get;
const authorize = require('../middleware/authorize');
const {fetchPerson} = require('../lib/fetch-db'),
      {checkPermission} = require('../lib/person');
const {personSchema, userSchema} = require('../lib/schemas'),
      Joi = require('joi');

const router = new Router();

const stat = promisify(fs.stat),
      mkdir = promisify(fs.mkdir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, req.uploadDir)
  },
  filename: function (req, file, cb) {
    // console.log('file: ' + JSON.stringify(file, null, 2))
    let filename = file.originalname;
    // filename = file.fieldname + '_' + Date.now() + filename.slice(filename.lastIndexOf('.'))
    filename = "picimage_" + Date.now() + ".jpg";
    cb(null, filename)
  }
});
function fileFilter (req, file, cb) {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true)
  } else {
    const err = new Error('only .jpeg or .png images allowed');
    err.status = 400;
    cb(err, false)
  }
}
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 9
  }
});

async function prepare(ctx, next) {
  // todo: person_key verify, perms
  const {person_key} = ctx.params;
  const person = await fetchPerson(person_key); // or throw 404
  if (await checkPermission(ctx.state.user, person, {manager: true})) {
    const uploadDir = path.join(config.get('uploadDir'), person_key);
    let stats;
    try {
      stats = await stat(uploadDir)
    } catch(err) {
      if (err.code === 'ENOENT') {
        await mkdir(uploadDir)
      } else {
        ctx.throw(err)
      }
    }
    ctx.req.uploadDir = uploadDir;
    await next()
  } else {
    ctx.throw(403, 'upload_is_not_allowed');
  }
}

async function uploadPic (ctx) { //POST
  const {person_key} = ctx.params;
  const file = ctx.req.file;
  const avatarPath = file.path.replace('picimage_', 'avatar_');
  const parts = avatarPath.split('/');
  const avatarFilename = parts[parts.length - 1];

  function gmWritePromise(imgPath) {
    return new Promise(function(resolve, reject) {
      gm(imgPath)
      .resize(250, 250).noProfile()
      .write(avatarPath, function(err){
        if(err) return reject(err);
        resolve()
      })
    })
  }
  await gmWritePromise(file.path);
  const Persons = db.collection('Persons');
  await Persons.update(person_key, {pic: avatarFilename});
  ctx.body = {pic: avatarFilename}
}

router
  .post('/pic/:person_key', prepare, upload.single('pic'), uploadPic);

module.exports = router.routes();
